export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  getSettingsOrSeed,
  jsonError,
  jsonOk,
  publicEventPayload,
} from "@/lib/api-utils";

/** GET /api/event — public event status (no sensitive fields). */
export async function GET() {
  try {
    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }
    const participantCount = await db.participant.count();
    return jsonOk({ ...publicEventPayload(settings), participantCount });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
