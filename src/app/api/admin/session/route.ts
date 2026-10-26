export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";

/** GET /api/admin/session — current admin session check. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Not signed in.", 401);
    }
    return jsonOk({ username: admin.username });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
