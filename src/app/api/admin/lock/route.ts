export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit } from "@/lib/auth";

/** POST /api/admin/lock — lock or unlock wishlist submissions. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // invalid/empty body — handled by the boolean check below
    }

    const locked = body.locked;
    if (typeof locked !== "boolean") {
      return jsonError("Hindi valid ang request. Pakisend ng { locked: true } o { locked: false }.", 400);
    }

    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }

    if (locked) {
      if (settings.submissionsLocked) {
        return jsonError("Naka-lock na po ang submissions.", 409);
      }
      const submitted = await db.participant.count({
        where: { wishlist: { isNot: null } },
      });
      const total = await db.participant.count();
      const pending = total - submitted;

      const lockedAt = new Date();
      await db.eventSettings.update({
        where: { id: "main" },
        data: { submissionsLocked: true, lockedAt, lockedBy: admin.username },
      });
      await audit(
        admin.username,
        "LOCK_SUBMISSIONS",
        `All submissions locked at party time — ${submitted} submitted, ${pending} pending.`
      );
      return jsonOk({ submissionsLocked: true, lockedAt, lockedBy: admin.username });
    }

    // Unlock — only allowed while no randomization has happened yet.
    if (settings.randomizationStatus !== "not_started") {
      return jsonError(
        "Hindi na puwedeng i-unlock ang submissions dahil may randomization na. Gumamit ng Reset sa Settings & Audit kung talagang kailangan.",
        400
      );
    }
    await db.eventSettings.update({
      where: { id: "main" },
      data: { submissionsLocked: false, lockedAt: null, lockedBy: null },
    });
    await audit(admin.username, "UNLOCK_SUBMISSIONS");
    return jsonOk({ submissionsLocked: false });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
