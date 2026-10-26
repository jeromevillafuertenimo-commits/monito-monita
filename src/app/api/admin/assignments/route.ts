export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";

/** GET /api/admin/assignments — full giver → recipient map with wishes (admin-only). */
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

    const rows = await db.assignment.findMany({
      include: { giver: true, recipient: { include: { wishlist: true } } },
      orderBy: { createdAt: "asc" },
    });

    const assignments = rows.map((a) => {
      const wl = a.recipient.wishlist;
      const wishes = wl
        ? [
            { name: wl.wish1Name, details: wl.wish1Details },
            { name: wl.wish2Name, details: wl.wish2Details },
            { name: wl.wish3Name, details: wl.wish3Details },
          ].filter((w): w is { name: string; details: string | null } => Boolean(w.name))
        : [];
      return {
        giver: {
          name: `${a.giver.firstName} ${a.giver.lastName}`,
          code: a.giver.identityCode,
        },
        recipient: {
          name: `${a.recipient.firstName} ${a.recipient.lastName}`,
          code: a.recipient.identityCode,
        },
        wishes,
      };
    });

    return jsonOk({
      released: settings.randomizationStatus === "released",
      releasedAt: settings.releasedAt,
      batchId: rows[0]?.batchId ?? null,
      assignments,
    });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
