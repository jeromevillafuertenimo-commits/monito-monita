export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit, hashPin, isValidPin, normalizePin } from "@/lib/auth";
import { normalizeWhitespace } from "@/lib/validation";
import {
  BACKUP_APP_TAG,
  type RestoreBackup,
} from "@/lib/backup";
import { randomUUID } from "crypto";

const MAX_PARTICIPANTS = 2000;

const MSG = {
  unauth: "Kailangan mag-login muna bilang admin.",
  badBody: "Hindi valid na backup file — kailangan ng JSON mula sa \"I-download ang Backup\".",
  badTag: "Hindi ito backup file ng Monito-Monita app.",
  badVersion: "Lumang format ang backup file na ito at hindi na suportado.",
  tooMany: `Masyadong maraming participants sa backup (hanggang ${MAX_PARTICIPANTS} lang).`,
  badParticipant: "May problemang row sa participants sa backup file.",
  duplicate: "May dobleng pangalan, identity code, o PIN sa loob ng backup file.",
  badAssignment: "May problemang assignments sa backup file — dapat bawat participant ay may isang hahatian at may isang nagbibigay sa kanya.",
} as const;

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asDateOrNull(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface ParsedParticipant {
  firstName: string;
  lastName: string;
  nameKey: string;
  sex: string;
  codeColor: string;
  codeWord: string;
  identityCode: string;
  codeKey: string;
  pin: string | null;
  pinHash: string | null;
  isSample: boolean;
  createdAt: Date;
  wishlist: {
    wish1Name: string | null;
    wish1Details: string | null;
    wish2Name: string | null;
    wish2Details: string | null;
    wish3Name: string | null;
    wish3Details: string | null;
    submittedAt: Date | null;
  } | null;
}

/** Parses and validates the uploaded backup JSON. Throws Error with a
 *  Taglish message the client can toast directly. */
function parseBackup(raw: unknown): {
  event: RestoreBackup["event"];
  participants: ParsedParticipant[];
  assignments: { giverCode: string; recipientCode: string }[];
} {
  if (!raw || typeof raw !== "object") throw new Error(MSG.badBody);
  const body = raw as RestoreBackup;
  if (body.app !== BACKUP_APP_TAG) throw new Error(MSG.badTag);
  if (body.version !== 1) throw new Error(MSG.badVersion);
  if (!Array.isArray(body.participants) || body.participants.length === 0) {
    throw new Error(MSG.badBody);
  }
  if (body.participants.length > MAX_PARTICIPANTS) throw new Error(MSG.tooMany);

  const nameKeys = new Set<string>();
  const codeKeys = new Set<string>();
  const pins = new Set<string>();
  const codeKeySet = new Set<string>();
  const parsedParticipants: ParsedParticipant[] = [];

  for (const p of body.participants) {
    if (!p || typeof p !== "object") throw new Error(MSG.badParticipant);
    const firstName = normalizeWhitespace(asString(p.firstName) ?? "");
    const lastName = normalizeWhitespace(asString(p.lastName) ?? "");
    const codeColor = (asString(p.codeColor) ?? "").trim();
    const codeWord = (asString(p.codeWord) ?? "").trim();
    const sex = (asString(p.sex) ?? "").trim().toLowerCase();
    if (!firstName || !lastName || !codeColor || !codeWord || (sex !== "male" && sex !== "female")) {
      throw new Error(MSG.badParticipant);
    }

    // PIN: plain 6 digits (re-hashed server-side so backups are pepper-portable).
    let pin: string | null = null;
    if (typeof p.pin === "string" && p.pin) {
      const normalized = normalizePin(p.pin);
      if (!isValidPin(normalized)) throw new Error(MSG.badParticipant);
      pin = normalized;
    }

    const nameKey = `${firstName} ${lastName}`.toLowerCase();
    const identityCode = `${codeColor} ${codeWord}`;
    const codeKey = identityCode.toLowerCase();
    if (nameKeys.has(nameKey) || codeKeys.has(codeKey) || (pin && pins.has(pin))) {
      throw new Error(MSG.duplicate);
    }
    nameKeys.add(nameKey);
    codeKeys.add(codeKey);
    if (pin) pins.add(pin);
    codeKeySet.add(codeKey);

    let wishlist: ParsedParticipant["wishlist"] = null;
    if (p.wishlist && typeof p.wishlist === "object") {
      const w = p.wishlist;
      const s = (v: unknown) => {
        const t = asString(v);
        return t && t.trim() ? t.trim().slice(0, 200) : null;
      };
      wishlist = {
        wish1Name: s(w.wish1Name),
        wish1Details: s(w.wish1Details),
        wish2Name: s(w.wish2Name),
        wish2Details: s(w.wish2Details),
        wish3Name: s(w.wish3Name),
        wish3Details: s(w.wish3Details),
        submittedAt: asDateOrNull(w.submittedAt),
      };
    }

    parsedParticipants.push({
      firstName,
      lastName,
      nameKey,
      sex,
      codeColor,
      codeWord,
      identityCode,
      codeKey,
      pin,
      pinHash: pin ? hashPin(pin) : null,
      isSample: p.isSample === true,
      createdAt: asDateOrNull(p.createdAt) ?? new Date(),
      wishlist,
    });
  }

  // Assignments: every participant gives exactly once and receives exactly once.
  let assignments: { giverCode: string; recipientCode: string }[] = [];
  if (Array.isArray(body.assignments) && body.assignments.length > 0) {
    const givers = new Map<string, string>();
    const recipients = new Map<string, string>();
    for (const a of body.assignments) {
      if (!a || typeof a !== "object") throw new Error(MSG.badAssignment);
      const giverCode = (asString(a.giverCode) ?? "").trim().toLowerCase();
      const recipientCode = (asString(a.recipientCode) ?? "").trim().toLowerCase();
      if (!giverCode || !recipientCode) throw new Error(MSG.badAssignment);
      if (!codeKeySet.has(giverCode) || !codeKeySet.has(recipientCode)) {
        throw new Error(MSG.badAssignment);
      }
      if (givers.has(giverCode) || recipients.has(recipientCode)) {
        throw new Error(MSG.badAssignment);
      }
      givers.set(giverCode, recipientCode);
      recipients.set(recipientCode, giverCode);
    }
    if (givers.size !== parsedParticipants.length) throw new Error(MSG.badAssignment);
    assignments = [...givers.entries()].map(([giverCode, recipientCode]) => ({
      giverCode,
      recipientCode,
    }));
  }

  // Event state: only accept known enum values.
  let event: RestoreBackup["event"] = null;
  if (body.event && typeof body.event === "object") {
    const e = body.event;
    const status = asString(e.randomizationStatus) ?? "not_started";
    event = {
      eventName: (asString(e.eventName) ?? "").trim() || "Christmas Fellowship Monito-Monita 2026",
      budgetMin: Number.isFinite(e.budgetMin) ? Math.max(1, Math.floor(e.budgetMin)) : 150,
      budgetMax: Number.isFinite(e.budgetMax) ? Math.max(1, Math.floor(e.budgetMax)) : 200,
      registrationOpen: e.registrationOpen === true,
      submissionsLocked: e.submissionsLocked === true,
      lockedAt: asDateOrNull(e.lockedAt)?.toISOString() ?? null,
      randomizationStatus: ["not_started", "completed", "released"].includes(status)
        ? status
        : "not_started",
      releasedAt: asDateOrNull(e.releasedAt)?.toISOString() ?? null,
    };
  }

  return { event, participants: parsedParticipants, assignments };
}

/** POST /api/admin/restore — replace ALL participants/wishlists/assignments
 *  (and the event state) with the contents of a downloaded backup file.
 *  Body: a RestoreBackup JSON. The admin cookie authorizes the call. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError(MSG.unauth, 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(MSG.badBody, 400);
  }

  try {
    const backup = parseBackup(raw);
    const withAssignments = backup.assignments.length > 0;

    const result = await db.$transaction(async (tx) => {
      await tx.assignment.deleteMany({});
      await tx.wishlist.deleteMany({});
      await tx.participant.deleteMany({});

      let wishlists = 0;
      const byCodeKey = new Map<string, string>();
      for (const p of backup.participants) {
        const created = await tx.participant.create({
          data: {
            firstName: p.firstName,
            lastName: p.lastName,
            nameKey: p.nameKey,
            sex: p.sex,
            codeColor: p.codeColor,
            codeWord: p.codeWord,
            identityCode: p.identityCode,
            codeKey: p.codeKey,
            pinHash: p.pinHash,
            pin: p.pin,
            // Sessions are never restored — everyone signs in again.
            sessionTokenHash: null,
            isSample: p.isSample,
            createdAt: p.createdAt,
            ...(p.wishlist
              ? {
                  wishlist: {
                    create: {
                      ...p.wishlist,
                      submittedAt: p.wishlist.submittedAt ?? p.createdAt,
                    },
                  },
                }
              : {}),
          },
        });
        byCodeKey.set(p.codeKey, created.id);
        if (p.wishlist) wishlists += 1;
      }

      let assignments = 0;
      if (withAssignments && backup.event) {
        const batchId = randomUUID();
        for (const a of backup.assignments) {
          const giverId = byCodeKey.get(a.giverCode);
          const recipientId = byCodeKey.get(a.recipientCode);
          if (!giverId || !recipientId) throw new Error(MSG.badAssignment);
          await tx.assignment.create({
            data: { batchId, giverId, recipientId },
          });
          assignments += 1;
        }
      }

      if (backup.event) {
        const status =
          withAssignments && backup.event.randomizationStatus === "not_started"
            ? "released"
            : backup.event.randomizationStatus;
        await tx.eventSettings.update({
          where: { id: "main" },
          data: {
            eventName: backup.event.eventName,
            budgetMin: backup.event.budgetMin,
            budgetMax: backup.event.budgetMax,
            registrationOpen: backup.event.registrationOpen,
            submissionsLocked: backup.event.submissionsLocked,
            lockedAt: backup.event.lockedAt ? new Date(backup.event.lockedAt) : null,
            randomizationStatus: status,
            releasedAt: backup.event.releasedAt ? new Date(backup.event.releasedAt) : null,
          },
        });
      }

      return {
        restored: {
          participants: backup.participants.length,
          wishlists,
          assignments,
        },
      };
    });

    await audit(
      admin.username,
      "RESTORE",
      `Narestore mula sa backup — ${result.restored.participants} participants, ${result.restored.wishlists} wishlists, ${result.restored.assignments} assignments.`
    );

    return jsonOk(result);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return jsonError(MSG.duplicate, 409);
    }
    if (
      err instanceof Error &&
      Object.values(MSG).includes(err.message as (typeof MSG)[keyof typeof MSG])
    ) {
      return jsonError(err.message, 400);
    }
    return jsonError("Hindi natuloy ang restore. Pakicheck ang backup file at subukan muli.", 500);
  }
}
