export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit, hashPassword, verifyPassword } from "@/lib/auth";
import { isStrongEnoughPassword } from "@/lib/validation";

/** POST /api/admin/password — change the signed-in admin's password. */
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
      // invalid/empty body — handled by the checks below
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    const row = await db.adminAccount.findFirst({ where: { username: admin.username } });
    if (!row) {
      return jsonError("Hindi nahanap ang admin account.", 401);
    }

    if (!verifyPassword(currentPassword, row.passwordHash)) {
      return jsonError("Mali ang current password.", 401);
    }
    if (!isStrongEnoughPassword(newPassword)) {
      return jsonError("Ang bagong password ay dapat may hindi bababa sa 8 characters.", 400);
    }

    await db.adminAccount.update({
      where: { id: row.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    await audit(admin.username, "PASSWORD_CHANGE");

    return jsonOk({});
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
