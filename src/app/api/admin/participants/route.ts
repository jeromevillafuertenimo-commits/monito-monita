export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin, wishlistDto } from "@/lib/api-utils";
import { audit, hashPin, isValidPin, normalizePin } from "@/lib/auth";
import { normalizeWhitespace, validateName, validateWishes } from "@/lib/validation";
import { customWordError, isValidSex, resolveColor, resolveWord } from "@/lib/words";

const DUPLICATE_NAME_MESSAGE =
  "May registration nang nakarehistro sa pangalang ito. Kung siya nga ito, mag-sign in na lang siya gamit ang First name, Last name, at PIN niya.";
const DUPLICATE_CODE_MESSAGE =
  "May gumagamit na ng code na ito. Pumili ng ibang color at flower/animal combination.";
const DUPLICATE_PIN_MESSAGE =
  "May gumagamit na ng PIN na ito. Pumili ng ibang 6-digit PIN.";
const MANAGE_BLOCKED_MESSAGE =
  "Hindi na puwedeng magdagdag ng participant dahil tapos na ang bunutan. I-reset mula sa Settings & Audit kung kailangan magsimula ulit.";

/** GET /api/admin/participants — full roster (real names + PINs, admin-only). */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    const rows = await db.participant.findMany({
      include: { wishlist: true },
      orderBy: { createdAt: "asc" },
    });

    return jsonOk({
      participants: rows.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        sex: p.sex,
        identityCode: p.identityCode,
        codeColor: p.codeColor, // prefill para sa Edit details dialog
        codeWord: p.codeWord,
        pin: p.pin, // admin-only visibility: para matulungan ang nakalimutan ang PIN
        isSample: p.isSample,
        createdAt: p.createdAt,
        wishlistSubmitted: Boolean(p.wishlist),
        submittedAt: p.wishlist?.submittedAt ?? null,
        wishlist: p.wishlist ? wishlistDto(p.wishlist) : null,
      })),
    });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}

/**
 * POST /api/admin/participants — admin manually encodes a participant with
 * ALL their details (First name, Last name, Sex, Color, Flower/Animal word,
 * 6-digit PIN). Para sa mga kasamang hindi maka-self-register (walang phone
 * o hindi marunong) — si admin na ang bahalang mag-input para sa kanila.
 *
 * Allowed kahit naka-lock ang submissions (huliang pasok bago ang bunutan),
 * pero HINDI na kapag tapos na ang randomization (masisira ang assignments).
 */
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
    if (settings.randomizationStatus !== "not_started") {
      return jsonError(MANAGE_BLOCKED_MESSAGE, 400);
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // invalid/empty body — validation below returns the proper error
    }

    const firstName = typeof body.firstName === "string" ? body.firstName : "";
    const lastName = typeof body.lastName === "string" ? body.lastName : "";
    const sex = typeof body.sex === "string" ? body.sex : "";
    let color = typeof body.color === "string" ? body.color.trim() : "";
    let word = typeof body.word === "string" ? body.word.trim() : "";
    const pin = normalizePin(typeof body.pin === "string" ? body.pin : "");

    // Same validation rules as self-registration — first error wins.
    const nameError = validateName(firstName, "first name") ?? validateName(lastName, "last name");
    if (nameError) return jsonError(nameError, 400);

    if (!isValidPin(pin)) {
      return jsonError(
        "Pakilagay ang 6-digit PIN (numbers lang, eksaktong 6 digits). Ito ang gamit niya para mag-sign in at makita ang Monito/Monita niya pagkatapos ng bunutan.",
        400
      );
    }
    if (!isValidSex(sex)) {
      return jsonError("Piliin ang sex: Babae (Female) o Lalaki (Male).", 400);
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

    // Optional wishlist (0-3 wishes). Mahalaga ito kapag naka-lock na ang
    // submissions: hindi na makakapag-submit ang participant, kaya dito na
    // mismo ilalagay ni admin ang wishes nila — kung hindi, hihinto ang
    // randomization sa kanya.
    let wishes: { name: string; details: string }[] = [];
    if (body.wishes !== undefined && body.wishes !== null) {
      const parsed = validateWishes(body.wishes);
      if (!parsed.ok) return jsonError(parsed.error, 400);
      wishes = parsed.wishes;
    }

    const normalizedFirst = normalizeWhitespace(firstName);
    const normalizedLast = normalizeWhitespace(lastName);
    const identityCode = `${color} ${word}`;
    const codeKey = identityCode.toLowerCase();
    const nameKey = `${normalizedFirst} ${normalizedLast}`.toLowerCase();

    const duplicateName = await db.participant.findUnique({ where: { nameKey } });
    if (duplicateName) {
      return jsonError(DUPLICATE_NAME_MESSAGE, 409);
    }

    const duplicateCode = await db.participant.findUnique({ where: { codeKey } });
    if (duplicateCode) {
      return jsonError(DUPLICATE_CODE_MESSAGE, 409);
    }

    const pinHash = hashPin(pin);

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
          pin,
        },
      });
      await audit(
        admin.username,
        "PARTICIPANT_ADDED",
        `Admin manually added ${identityCode} (${normalizedFirst} ${normalizedLast})${
          wishes.length > 0 ? ` with ${wishes.length} wishlist item(s)` : ""
        }`,
        participant.id
      );

      if (wishes.length > 0) {
        await db.wishlist.create({
          data: {
            participantId: participant.id,
            wish1Name: wishes[0]?.name ?? null,
            wish1Details: wishes[0]?.details ?? null,
            wish2Name: wishes[1]?.name ?? null,
            wish2Details: wishes[1]?.details ?? null,
            wish3Name: wishes[2]?.name ?? null,
            wish3Details: wishes[2]?.details ?? null,
          },
        });
      }

      return jsonOk({ identityCode, pin }, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Concurrent race: report which unique field collided.
        const target = (error.meta as { target?: string[] } | undefined)?.target ?? [];
        if (target.includes("pinHash") || target.includes("pin")) {
          return jsonError(DUPLICATE_PIN_MESSAGE, 409);
        }
        if (target.includes("nameKey")) return jsonError(DUPLICATE_NAME_MESSAGE, 409);
        return jsonError(DUPLICATE_CODE_MESSAGE, 409);
      }
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
