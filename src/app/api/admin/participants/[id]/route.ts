export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit, hashPin, isValidPin, normalizePin } from "@/lib/auth";
import { normalizeWhitespace, validateName } from "@/lib/validation";
import { customWordError, isValidSex, resolveColor, resolveWord } from "@/lib/words";

const DUPLICATE_NAME_MESSAGE =
  "May registration nang nakarehistro sa pangalang ito. Kung siya nga ito, mag-sign in na lang siya gamit ang First name, Last name, at PIN niya.";
const DUPLICATE_CODE_MESSAGE =
  "May gumagamit na ng code na ito. Pumili ng ibang color at flower/animal combination.";
const DUPLICATE_PIN_MESSAGE =
  "May gumagamit na ng PIN na ito. Pumili ng ibang 6-digit PIN.";
const EDIT_BLOCKED_MESSAGE =
  "Tapos na ang bunutan — hindi na puwedeng i-edit ang participant dahil masisira ang assignments. Puwede mo pa siyang i-delete kung tumanggi na siyang sumali.";

/**
 * PATCH /api/admin/participants/[id] — admin edits a participant's details:
 * First/Last name, sex, color/word (identity code), and 6-digit PIN.
 * Allowed kahit naka-lock ang submissions, pero HINDI na kapag tapos na ang
 * randomization (masisira ang assignments). Ang DELETE ay pinapayagan pa rin
 * pagkatapos ng bunutan (para sa last-minute na nag-back-out) — ang cascade
 * sa schema ang bahalang maglinis ng assignments niya.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return jsonError(EDIT_BLOCKED_MESSAGE, 400);
    }

    const { id } = await params;
    const participant = await db.participant.findUnique({ where: { id } });
    if (!participant) {
      return jsonError("Hindi nahanap ang participant.", 404);
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

    // Same validation rules as manual add — first error wins.
    const nameError = validateName(firstName, "first name") ?? validateName(lastName, "last name");
    if (nameError) return jsonError(nameError, 400);
    if (!isValidPin(pin)) {
      return jsonError(
        "Pakilagay ang 6-digit PIN (numbers lang, eksaktong 6 digits). Ito ang gamit niya para mag-sign in.",
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

    const normalizedFirst = normalizeWhitespace(firstName);
    const normalizedLast = normalizeWhitespace(lastName);
    const identityCode = `${color} ${word}`;
    const codeKey = identityCode.toLowerCase();
    const nameKey = `${normalizedFirst} ${normalizedLast}`.toLowerCase();

    // Uniqueness checks — each ignores the participant being edited.
    const duplicateName = await db.participant.findUnique({ where: { nameKey } });
    if (duplicateName && duplicateName.id !== participant.id) {
      return jsonError(DUPLICATE_NAME_MESSAGE, 409);
    }
    const duplicateCode = await db.participant.findUnique({ where: { codeKey } });
    if (duplicateCode && duplicateCode.id !== participant.id) {
      return jsonError(DUPLICATE_CODE_MESSAGE, 409);
    }

    const pinChanged = pin !== participant.pin;
    const pinHash = pinChanged ? hashPin(pin) : participant.pinHash;
    if (pinChanged && pinHash) {
      const duplicatePin = await db.participant.findUnique({ where: { pinHash } });
      if (duplicatePin && duplicatePin.id !== participant.id) {
        return jsonError(DUPLICATE_PIN_MESSAGE, 409);
      }
    }

    try {
      await db.participant.update({
        where: { id: participant.id },
        data: {
          firstName: normalizedFirst,
          lastName: normalizedLast,
          nameKey,
          sex,
          codeColor: color,
          codeWord: word,
          identityCode,
          codeKey,
          // Only rotate the PIN when it actually changed — keeps the
          // participant's current sign-in session alive otherwise.
          ...(pinChanged ? { pinHash, pin, sessionTokenHash: null } : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = (error.meta as { target?: string[] } | undefined)?.target ?? [];
        if (target.includes("pinHash") || target.includes("pin")) {
          return jsonError(DUPLICATE_PIN_MESSAGE, 409);
        }
        if (target.includes("nameKey")) return jsonError(DUPLICATE_NAME_MESSAGE, 409);
        return jsonError(DUPLICATE_CODE_MESSAGE, 409);
      }
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }

    await audit(
      admin.username,
      "PARTICIPANT_EDITED",
      `Admin edited ${participant.identityCode} → ${identityCode} (${normalizedFirst} ${normalizedLast})${
        pinChanged ? "; PIN changed (old sessions signed out)" : ""
      }`,
      participant.id
    );

    return jsonOk({ ok: true, identityCode, pin });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}

/**
 * DELETE /api/admin/participants/[id] — removes the participant at any stage
 * (post-bunutan included, para sa mga biglang umatras). Wishlist + assignments
 * (parehong direction) ay automatic na mabubura via onDelete: Cascade.
 */
export async function DELETE(
  _request: Request,
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

    await db.participant.delete({ where: { id: participant.id } });

    await audit(
      admin.username,
      "PARTICIPANT_DELETED",
      `Admin deleted ${participant.identityCode} (${participant.firstName} ${participant.lastName}) — wishlist at assignments niya ay kasamang nabura`,
      participant.id
    );

    return jsonOk({ ok: true });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
