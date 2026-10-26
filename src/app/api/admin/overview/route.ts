export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  getSettingsOrSeed,
  jsonError,
  jsonOk,
  publicEventPayload,
  requireAdmin,
} from "@/lib/api-utils";

/** GET /api/admin/overview — dashboard totals, blockers, and randomize eligibility. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }

    const [total, submitted, sampleParticipants, allRows] = await Promise.all([
      db.participant.count(),
      db.participant.count({ where: { wishlist: { isNot: null } } }),
      db.participant.count({ where: { isSample: true } }),
      db.participant.findMany({ select: { codeKey: true } }),
    ]);
    const pending = total - submitted;

    // Group by codeKey; count extra rows beyond the first (normally always 0
    // thanks to the unique constraint).
    const codeCounts = new Map<string, number>();
    for (const row of allRows) {
      codeCounts.set(row.codeKey, (codeCounts.get(row.codeKey) ?? 0) + 1);
    }
    let duplicateCodes = 0;
    for (const count of codeCounts.values()) {
      if (count > 1) duplicateCodes += count - 1;
    }

    const pendingRows = await db.participant.findMany({
      where: { wishlist: null },
      select: { identityCode: true },
      orderBy: { createdAt: "asc" },
    });
    const pendingCodes = pendingRows.map((p) => p.identityCode);

    const blockers: string[] = [];
    if (!settings.submissionsLocked) {
      blockers.push("Hindi pa naka-lock ang submissions.");
    }
    if (total < 2) {
      blockers.push("Kailangan ng hindi bababa sa 2 (dalawang) participants.");
    }
    if (pending > 0) {
      blockers.push(`${pending} participant(s) ang hindi pa nakasubmit ng wishlist.`);
    }
    if (settings.randomizationStatus === "released") {
      blockers.push(
        "Released na ang assignments — hindi na pwedeng mag-randomize muli nang walang reset."
      );
    }

    const canRandomize =
      blockers.length === 0 &&
      settings.submissionsLocked &&
      total >= 2 &&
      pending === 0 &&
      settings.randomizationStatus !== "released";

    return jsonOk({
      event: {
        ...publicEventPayload(settings),
        lockedBy: settings.lockedBy,
        releasedBy: settings.releasedBy,
      },
      totals: { participants: total, submitted, pending, sampleParticipants, duplicateCodes },
      canRandomize,
      blockers,
      pendingCodes,
    });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
