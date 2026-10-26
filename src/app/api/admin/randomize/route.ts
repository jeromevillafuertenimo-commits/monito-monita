export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit } from "@/lib/auth";
import { generateDerangement, verifyDerangement } from "@/lib/derangement";

const VERIFY_FAILED_MESSAGE =
  "Nabigo ang security check ng randomization. Pakisubok muli.";

/** POST /api/admin/randomize — run the official bunutan (derangement, transaction-verified). */
export async function POST() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }

    const blockers: string[] = [];
    if (!settings.submissionsLocked) {
      blockers.push("Hindi pa naka-lock ang submissions.");
    }
    if (settings.randomizationStatus === "released") {
      blockers.push(
        "Released na po ang assignments. Hindi na ito pwedeng baguhin nang walang emergency reset."
      );
    }

    const total = await db.participant.count();
    if (total < 2) {
      blockers.push("Kulang ang participants para sa bunutan (minimum 2).");
    }

    const withoutWishlist = await db.participant.findMany({
      where: { wishlist: null },
      select: { identityCode: true },
      orderBy: { createdAt: "asc" },
    });
    if (withoutWishlist.length > 0) {
      blockers.push(
        `May participants na walang wishlist: ${withoutWishlist
          .map((p) => p.identityCode)
          .join(", ")}`
      );
    }

    if (blockers.length > 0) {
      return NextResponse.json({ error: blockers[0], blockers }, { status: 400 });
    }

    const participants = await db.participant.findMany({
      where: { wishlist: { isNot: null } },
      orderBy: { createdAt: "asc" },
    });
    const n = participants.length;
    if (n < 2) {
      return jsonError("Kulang ang participants para sa bunutan (minimum 2).", 400);
    }

    const derangement = generateDerangement(n);
    if (!derangement || !verifyDerangement(derangement, n)) {
      return jsonError(VERIFY_FAILED_MESSAGE, 500);
    }

    const batchId = randomUUID();

    try {
      await db.$transaction(async (tx) => {
        await tx.assignment.deleteMany({});
        for (let i = 0; i < n; i++) {
          await tx.assignment.create({
            data: {
              batchId,
              giverId: participants[i].id,
              recipientId: participants[derangement[i]].id,
            },
          });
        }

        // Double-check inside the transaction: no self-assignment, every giver
        // and recipient appears exactly once. Throw to roll back on failure.
        const saved = await tx.assignment.findMany({ where: { batchId } });
        const giverIds = new Set(saved.map((a) => a.giverId));
        const recipientIds = new Set(saved.map((a) => a.recipientId));
        const selfAssigned = saved.some((a) => a.giverId === a.recipientId);
        if (saved.length !== n || giverIds.size !== n || recipientIds.size !== n || selfAssigned) {
          throw new Error("RANDOMIZATION_VERIFICATION_FAILED");
        }

        if (
          settings.randomizationStatus === "not_started" ||
          settings.randomizationStatus === "completed"
        ) {
          await tx.eventSettings.update({
            where: { id: "main" },
            data: { randomizationStatus: "completed" },
          });
        }
      });
    } catch {
      return jsonError(VERIFY_FAILED_MESSAGE, 500);
    }

    await audit(
      admin.username,
      "RANDOMIZE",
      `Official bunutan completed: ${n} assignments (batch ${batchId})`
    );

    return jsonOk({
      batchId,
      assignments: participants.map((p, i) => ({
        giverCode: p.identityCode,
        recipientCode: participants[derangement[i]].identityCode,
      })),
    });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
