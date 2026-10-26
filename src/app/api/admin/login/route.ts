export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { jsonError, jsonOk, setAdminCookie } from "@/lib/api-utils";
import { audit, ensureSeed, verifyPassword } from "@/lib/auth";

/** POST /api/admin/login — username + password, sets the signed session cookie. */
export async function POST(request: Request) {
  try {
    await ensureSeed();

    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // invalid/empty body — handled by the credential check below
    }

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const admins = await db.adminAccount.findMany();
    const admin =
      admins.find((a) => a.username.toLowerCase() === username.toLowerCase()) ?? null;

    if (!admin || !password || !verifyPassword(password, admin.passwordHash)) {
      await audit(username || "unknown", "ADMIN_LOGIN_FAILED");
      return jsonError("Mali ang username o password. Pakisubok ulit.", 401);
    }

    if (admin.status !== "active") {
      return jsonError("Deactivated ang admin account na ito.", 403);
    }

    await setAdminCookie(admin.username);
    await audit(admin.username, "ADMIN_LOGIN");
    return jsonOk({ username: admin.username });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
