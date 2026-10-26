export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit } from "@/lib/auth";

/** POST /api/admin/reset — EMERGENCY reset: delete all assignments, back to not_started. */
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

    if (settings.randomizationStatus === "not_started") {
      return jsonError("Wala namang assignments para i-reset.", 400);
    }

    await db.$transaction([
      db.assignment.deleteMany(),
      db.eventSettings.update({
        where: { id: "main" },
        data: { randomizationStatus: "not_started", releasedAt: null, releasedBy: null },
      }),
    ]);

    await audit(
      admin.username,
      "RESET_ASSIGNMENTS",
      "EMERGENCY RESET: All assignments deleted; participants must re-check after next release."
    );

    return jsonOk({});
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
