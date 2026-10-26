export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit } from "@/lib/auth";

/** POST /api/admin/release — publish the completed bunutan to participants. */
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

    if (settings.randomizationStatus === "released") {
      return jsonError("Released na po ang assignments sa participants.", 409);
    }
    if (settings.randomizationStatus !== "completed") {
      return jsonError("Kailangan munang tumakbo ang randomization bago i-release.", 400);
    }

    const [assignmentCount, eligibleCount] = await Promise.all([
      db.assignment.count(),
      db.participant.count({ where: { wishlist: { isNot: null } } }),
    ]);
    if (assignmentCount !== eligibleCount) {
      return jsonError("May kulang sa assignments — pakire-run muna ang randomization.", 400);
    }

    const releasedAt = new Date();
    await db.eventSettings.update({
      where: { id: "main" },
      data: { randomizationStatus: "released", releasedAt, releasedBy: admin.username },
    });

    await audit(admin.username, "RELEASE_ASSIGNMENTS", "Assignments released to participants");

    return jsonOk({ releasedAt, releasedBy: admin.username });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
