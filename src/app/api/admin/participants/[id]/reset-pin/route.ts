export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit, hashPin, isValidPin, normalizePin } from "@/lib/auth";

const DUPLICATE_PIN_MESSAGE =
  "May gumagamit na ng PIN na ito. Pumili ng ibang 6-digit PIN.";

/**
 * POST /api/admin/participants/[id]/reset-pin — admin sets a NEW 6-digit PIN
 * for a participant who forgot theirs. Replaces the old private-link
 * recovery: with name + PIN sign-in there are no links to recover anymore.
 * The new PIN must be shared with the participant by the admin personally.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    const { id } = await params;
    const participant = await db.participant.findUnique({ where: { id } });
    if (!participant) {
      return jsonError("Hindi nahanap ang participant.", 404);
    }

    let pin = "";
    try {
      const body = (await request.json()) as { pin?: unknown };
      pin = normalizePin(typeof body.pin === "string" ? body.pin : "");
    } catch {
      return jsonError("Pakilagay ang bagong 6-digit PIN.", 400);
    }
    if (!isValidPin(pin)) {
      return jsonError(
        "Pakilagay ang bagong PIN (numbers lang, eksaktong 6 digits).",
        400
      );
    }

    const pinHash = hashPin(pin);
    try {
      await db.participant.update({
        where: { id: participant.id },
        data: { pinHash, pin, sessionTokenHash: null },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return jsonError(DUPLICATE_PIN_MESSAGE, 409);
      }
      throw error;
    }

    await audit(
      admin.username,
      "PIN_RESET",
      `Admin reset the 6-digit PIN of ${participant.identityCode} (${participant.firstName} ${participant.lastName})`,
      participant.id
    );

    return jsonOk({ ok: true, identityCode: participant.identityCode });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
