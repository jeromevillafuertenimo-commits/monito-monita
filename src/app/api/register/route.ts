export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk } from "@/lib/api-utils";
import {
  audit,
  generateAccessToken,
  hashPin,
  hashToken,
  isValidPin,
  normalizePin,
} from "@/lib/auth";
import { normalizeWhitespace, validateName } from "@/lib/validation";
import { customWordError, isValidSex, resolveColor, resolveWord } from "@/lib/words";

const DUPLICATE_CODE_MESSAGE =
  "May gumagamit na ng code na ito. Please choose another color and flower/animal combination.";
const DUPLICATE_PIN_MESSAGE =
  "May gumagamit na ng PIN na ito. Pumili ng ibang 6-digit PIN para sa iyo.";

/** POST /api/register — create a participant, start their session right away. */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // invalid/empty body — validation below returns the proper error
    }

    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }
    if (!settings.registrationOpen) {
      return jsonError("Sarado na po ang registration. Pakicontact ang admin.", 403);
    }

    const firstName = typeof body.firstName === "string" ? body.firstName : "";
    const lastName = typeof body.lastName === "string" ? body.lastName : "";
    const sex = typeof body.sex === "string" ? body.sex : "";
    let color = typeof body.color === "string" ? body.color.trim() : "";
    let word = typeof body.word === "string" ? body.word.trim() : "";
    const pin = normalizePin(typeof body.pin === "string" ? body.pin : "");

    // Return the FIRST validation error found.
    const nameError = validateName(firstName, "first name") ?? validateName(lastName, "last name");
    if (nameError) return jsonError(nameError, 400);

    if (!isValidPin(pin)) {
      return jsonError(
        "Pakilagay ang 6-digit PIN mo (numbers lang, eksaktong 6 digits). Ito ang gagamitin mo para makita ang Monito/Monita mo pagkatapos ng bunutan.",
        400
      );
    }

    if (!isValidSex(sex)) {
      return jsonError("Piliin ang iyong sex: Female o Male.", 400);
    }
    const colorResolved = resolveColor(color);
    if (!colorResolved) {
      return jsonError(customWordError(color, "color") ?? "Pumili o mag-type ng color.", 400);
    }
    color = colorResolved;
    const wordResolved = resolveWord(word, sex);
    if (!wordResolved) {
      return jsonError(
        customWordError(word, sex === "female" ? "flower" : "animal") ??
          `Pumili o mag-type ng ${sex === "female" ? "flower" : "animal"}.`,
        400
      );
    }
    word = wordResolved;

    const normalizedFirst = normalizeWhitespace(firstName);
    const normalizedLast = normalizeWhitespace(lastName);
    const identityCode = `${color} ${word}`;
    const codeKey = identityCode.toLowerCase();
    const nameKey = `${normalizedFirst} ${normalizedLast}`.toLowerCase();

    const duplicateName = await db.participant.findUnique({ where: { nameKey } });
    if (duplicateName) {
      return jsonError(
        "May registration nang nakarehistro sa pangalang ito. Kung ikaw nga ito, mag-sign in na lang gamit ang First name, Last name, at PIN mo, o humingi ng tulong sa admin.",
        409
      );
    }

    const duplicateCode = await db.participant.findUnique({ where: { codeKey } });
    if (duplicateCode) {
      return jsonError(DUPLICATE_CODE_MESSAGE, 409);
    }

    const pinHash = hashPin(pin);
    // Plain PIN is stored for admin support (the admin table shows each
    // participant's 6-digit code so they can help anyone who forgets it).
    const pinPlain = pin;

    const sessionToken = generateAccessToken();

    try {
      const participant = await db.participant.create({
        data: {
          firstName: normalizedFirst,
          lastName: normalizedLast,
          nameKey,
          sex,
          codeColor: color,
          codeWord: word,
          identityCode,
          codeKey,
          pinHash,
          pin: pinPlain,
          sessionTokenHash: hashToken(sessionToken),
        },
      });
      await audit(
        "participant",
        "REGISTRATION",
        `Registered with code ${identityCode}`,
        participant.id
      );
      return jsonOk({ identityCode, sessionToken }, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Concurrent registration race: report which unique field collided.
        const target = (error.meta as { target?: string[] } | undefined)?.target ?? [];
        if (target.includes("pinHash")) return jsonError(DUPLICATE_PIN_MESSAGE, 409);
        return jsonError(DUPLICATE_CODE_MESSAGE, 409);
      }
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
