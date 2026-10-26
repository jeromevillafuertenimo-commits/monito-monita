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
import { audit } from "@/lib/auth";

/** POST /api/admin/settings — update event name, budget range, registration flag. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // invalid/empty body — treated as "no fields provided"
    }

    const data: Record<string, unknown> = {};

    if (body.eventName !== undefined) {
      const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
      if (eventName.length < 1 || eventName.length > 80) {
        return jsonError("Ang event name ay dapat 1 hanggang 80 characters.", 400);
      }
      data.eventName = eventName;
    }

    let budgetMin = settings.budgetMin;
    let budgetMax = settings.budgetMax;
    if (body.budgetMin !== undefined) {
      const v = body.budgetMin;
      if (
        typeof v !== "number" ||
        !Number.isInteger(v) ||
        v < 1 ||
        v > 100000
      ) {
        return jsonError(
          "Ang budget minimum ay dapat isang buong numero mula 1 hanggang 100000.",
          400
        );
      }
      budgetMin = v;
    }
    if (body.budgetMax !== undefined) {
      const v = body.budgetMax;
      if (
        typeof v !== "number" ||
        !Number.isInteger(v) ||
        v < 1 ||
        v > 100000
      ) {
        return jsonError(
          "Ang budget maximum ay dapat isang buong numero mula 1 hanggang 100000.",
          400
        );
      }
      budgetMax = v;
    }
    if (budgetMin >= budgetMax) {
      return jsonError("Ang budget minimum ay dapat mas maliit kaysa maximum.", 400);
    }
    if (body.budgetMin !== undefined) data.budgetMin = budgetMin;
    if (body.budgetMax !== undefined) data.budgetMax = budgetMax;

    if (body.registrationOpen !== undefined) {
      if (typeof body.registrationOpen !== "boolean") {
        return jsonError("Hindi valid ang value ng registrationOpen.", 400);
      }
      data.registrationOpen = body.registrationOpen;
    }

    const updated = await db.eventSettings.update({
      where: { id: "main" },
      data,
    });

    await audit(admin.username, "SETTINGS_UPDATE", `Updated: ${JSON.stringify(data)}`);

    return jsonOk({ event: publicEventPayload(updated) });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
