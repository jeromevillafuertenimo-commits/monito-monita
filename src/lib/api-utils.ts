// Server-side helpers shared by all API route handlers.
import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  ensureSeed,
  signAdminSession,
  verifyAdminSession,
} from "@/lib/auth";

export function jsonError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function getSettingsOrSeed() {
  await ensureSeed();
  const settings = await db.eventSettings.findUnique({ where: { id: "main" } });
  if (!settings) return settings;

  // Scheduled changes (set by the admin) are applied lazily: the first request
  // after the chosen time flips the switch, exactly like the manual buttons.
  const now = new Date();
  const patch: Record<string, unknown> = {};
  const notes: string[] = [];
  if (settings.registrationOpen && settings.registrationClosesAt && settings.registrationClosesAt <= now) {
    patch.registrationOpen = false;
    patch.registrationClosesAt = null;
    notes.push("registration closed");
  }
  if (
    !settings.submissionsLocked &&
    settings.submissionsLockAt &&
    settings.submissionsLockAt <= now &&
    settings.randomizationStatus === "not_started"
  ) {
    patch.submissionsLocked = true;
    patch.lockedAt = now;
    patch.lockedBy = "scheduler";
    patch.submissionsLockAt = null;
    notes.push("submissions locked");
  }
  if (Object.keys(patch).length === 0) return settings;
  try {
    const updated = await db.eventSettings.update({ where: { id: "main" }, data: patch });
    const { audit } = await import("@/lib/auth");
    await audit("scheduler", "SCHEDULED_CHANGE", `Applied schedule: ${notes.join(", ")}`);
    return updated;
  } catch {
    return settings;
  }
}

/** Returns the signed-in admin username or null. */
export async function currentAdmin(): Promise<{ username: string } | null> {
  const store = await cookies();
  return verifyAdminSession(store.get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireAdmin(): Promise<{ username: string } | null> {
  const admin = await currentAdmin();
  return admin;
}

export async function setAdminCookie(username: string): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, signAdminSession(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Resolves the participant from a Bearer token — the ephemeral session token
 * issued on sign-in (registration or name+PIN login), stored as its SHA-256
 * in `sessionTokenHash`.
 */
export async function participantFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { hashToken } = await import("@/lib/auth");
  const hash = hashToken(token);
  return db.participant.findUnique({
    where: { sessionTokenHash: hash },
    include: { wishlist: true },
  });
}

export function publicEventPayload(settings: {
  eventName: string;
  budgetMin: number;
  budgetMax: number;
  registrationOpen: boolean;
  submissionsLocked: boolean;
  randomizationStatus: string;
  lockedAt: Date | null;
  releasedAt: Date | null;
  registrationClosesAt?: Date | null;
  submissionsLockAt?: Date | null;
}) {
  return {
    registrationClosesAt: settings.registrationClosesAt ?? null,
    submissionsLockAt: settings.submissionsLockAt ?? null,
    eventName: settings.eventName,
    budgetMin: settings.budgetMin,
    budgetMax: settings.budgetMax,
    registrationOpen: settings.registrationOpen,
    submissionsLocked: settings.submissionsLocked,
    randomizationStatus: settings.randomizationStatus,
    lockedAt: settings.lockedAt,
    releasedAt: settings.releasedAt,
  };
}

/** Converts a stored wishlist row into the public DTO (only for the rightful viewer). */
export function wishlistDto(wishlist: {
  wish1Name: string | null;
  wish1Details: string | null;
  wish2Name: string | null;
  wish2Details: string | null;
  wish3Name: string | null;
  wish3Details: string | null;
  submittedAt: Date;
  updatedAt: Date;
}) {
  return {
    wish1Name: wishlist.wish1Name,
    wish1Details: wishlist.wish1Details,
    wish2Name: wishlist.wish2Name,
    wish2Details: wishlist.wish2Details,
    wish3Name: wishlist.wish3Name,
    wish3Details: wishlist.wish3Details,
    submittedAt: wishlist.submittedAt,
    updatedAt: wishlist.updatedAt,
  };
}

/**
 * Builds the public access payload (identity code + released assignment).
 * SECURITY: real names are never included; the assignment is attached ONLY
 * when randomizationStatus === "released".
 */
export async function buildAccessResult(
  participant: { id: string; identityCode: string; wishlist: unknown },
  released: boolean
): Promise<{
  identityCode: string;
  wishlistSubmitted: boolean;
  released: boolean;
  assignment: { recipientCode: string; wishes: { name: string; details: string | null }[] } | null;
}> {
  let assignment: {
    recipientCode: string;
    wishes: { name: string; details: string | null }[];
  } | null = null;

  if (released) {
    const row = await db.assignment.findFirst({
      where: { giverId: participant.id },
      include: { recipient: { include: { wishlist: true } } },
    });
    const wishlist = row?.recipient.wishlist;
    if (row && wishlist) {
      const wishes = [
        { name: wishlist.wish1Name, details: wishlist.wish1Details },
        { name: wishlist.wish2Name, details: wishlist.wish2Details },
        { name: wishlist.wish3Name, details: wishlist.wish3Details },
      ].filter((w): w is { name: string; details: string | null } => Boolean(w.name));
      assignment = { recipientCode: row.recipient.identityCode, wishes };
    }
  }

  return {
    identityCode: participant.identityCode,
    wishlistSubmitted: Boolean(participant.wishlist),
    released,
    assignment,
  };
}
