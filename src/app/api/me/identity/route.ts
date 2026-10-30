export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, participantFromRequest } from "@/lib/api-utils";
import { audit } from "@/lib/auth";
import { customWordError, resolveColor, resolveWord } from "@/lib/words";

const DUPLICATE_CODE_MESSAGE =
  "May gumagamit na ng code na ito. Please choose another color and flower/animal combination.";

/** PATCH /api/me/identity — a signed-in participant changes their own identity
 * code (color + flower/animal). Only allowed while registration is open and
 * before submissions are locked / the draw has started. */
export async function PATCH(request: Request) {
  try {
    const participant = await participantFromRequest(request);
    if (!participant) {
      return jsonError(
        "Hindi valid ang iyong access. Pakisign in ulit gamit ang First name, Last name, at PIN mo.",
        401
      );
    }
    const settings = await getSettingsOrSeed();
    if (!settings) return jsonError("May problema sa server. Pakisubok muli.", 500);
    if (
      !settings.registrationOpen ||
      settings.submissionsLocked ||
      settings.randomizationStatus !== "not_started"
    ) {
      return jsonError(
        "Sarado na ang registration kaya hindi na puwedeng baguhin ang identity code. Pakicontact ang admin kung kailangan.",
        403
      );
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // validation below returns the proper error
    }
    const rawColor = typeof body.color === "string" ? body.color : "";
    const rawWord = typeof body.word === "string" ? body.word : "";
    const kind = participant.sex === "female" ? "flower" : "animal";

    const color = resolveColor(rawColor);
    if (!color) return jsonError(customWordError(rawColor, "color") ?? "Pumili o mag-type ng color.", 400);
    const word = resolveWord(rawWord, participant.sex);
    if (!word) return jsonError(customWordError(rawWord, kind) ?? `Pumili o mag-type ng ${kind}.`, 400);

    const identityCode = `${color} ${word}`;
    const codeKey = identityCode.toLowerCase();
    if (codeKey === participant.codeKey) {
      return jsonOk({ identityCode: participant.identityCode, changed: false });
    }

    const duplicate = await db.participant.findUnique({ where: { codeKey } });
    if (duplicate && duplicate.id !== participant.id) {
      return jsonError(DUPLICATE_CODE_MESSAGE, 409);
    }

    try {
      await db.participant.update({
        where: { id: participant.id },
        data: { codeColor: color, codeWord: word, identityCode, codeKey },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return jsonError(DUPLICATE_CODE_MESSAGE, 409);
      }
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }
    await audit(
      "participant",
      "IDENTITY_CODE_CHANGE",
      `Changed code ${participant.identityCode} -> ${identityCode}`,
      participant.id
    );
    return jsonOk({ identityCode, changed: true });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
