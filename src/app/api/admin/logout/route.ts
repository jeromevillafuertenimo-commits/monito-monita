export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { clearAdminCookie, jsonError, jsonOk } from "@/lib/api-utils";

/** POST /api/admin/logout — clears the admin session cookie. */
export async function POST() {
  try {
    await clearAdminCookie();
    return jsonOk({});
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
