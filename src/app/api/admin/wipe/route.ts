export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api-utils";
import { verifyPassword } from "@/lib/auth";

/**
 * POST /api/admin/wipe — DELETE ALL DATA (nuclear option).
 *
 * Deletes every participant, wishlist, and assignment, then resets the event
 * state machine (unlocked, bunutan not started). Event settings (name, budget,
 * registration flag), the admin account, and the audit log are kept — the wipe
 * itself is recorded in the audit log.
 *
 * SECURITY: requires BOTH a valid admin session cookie AND a correct admin
 * password in the body. A wrong password deletes nothing.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    let password = "";
    try {
      const body = (await request.json()) as { password?: unknown };
      password = typeof body.password === "string" ? body.password : "";
    } catch {
      return jsonError("Pakilagay ang admin password para i-confirm.", 400);
    }
    if (!password) {
      return jsonError("Pakilagay ang admin password para i-confirm.", 400);
    }

    const account = await db.adminAccount.findUnique({
      where: { username: admin.username },
    });
    if (!account || !verifyPassword(password, account.passwordHash)) {
      return jsonError("Mali ang admin password. Walang binura na data.", 401);
    }

    const counts = await db.$transaction(async (tx) => {
      const assignments = await tx.assignment.deleteMany();
      const wishlists = await tx.wishlist.deleteMany();
      const participants = await tx.participant.deleteMany();
      await tx.eventSettings.update({
        where: { id: "main" },
        data: {
          submissionsLocked: false,
          lockedAt: null,
          lockedBy: null,
          randomizationStatus: "not_started",
          releasedAt: null,
          releasedBy: null,
        },
      });
      return {
        participants: participants.count,
        wishlists: wishlists.count,
        assignments: assignments.count,
      };
    });

    await db.auditLog.create({
      data: {
        actor: admin.username,
        action: "DELETE_ALL_DATA",
        details: `Binura ang LAHAT ng data — ${counts.participants} participants, ${counts.wishlists} wishlists, ${counts.assignments} assignments. Na-reset ang event state (unlocked, bunutan not started).`,
      },
    });

    return NextResponse.json({ ok: true, deleted: counts });
  } catch {
    return jsonError("May problema sa server. Walang binura — pakisubok muli.", 500);
  }
}
