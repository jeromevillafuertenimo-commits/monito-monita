export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";

/** GET /api/admin/audit — newest-first audit trail (last 200 entries). */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return jsonOk({ logs });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
