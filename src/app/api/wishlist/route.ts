export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  getSettingsOrSeed,
  jsonError,
  jsonOk,
  participantFromRequest,
  wishlistDto,
} from "@/lib/api-utils";
import { audit } from "@/lib/auth";
import { validateWishes } from "@/lib/validation";

/** POST /api/wishlist — submit or update the participant's wishlist (1..3 wishes). */
export async function POST(request: Request) {
  try {
    const participant = await participantFromRequest(request);
    if (!participant) {
      return jsonError(
        "Hindi valid ang iyong access. Pakisign in ulit gamit ang First name, Last name, at PIN mo.",
        401
      );
    }

    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }
    if (settings.submissionsLocked) {
      return jsonError(
        "Naka-lock na po ang submissions. Hindi na puwedeng mag-edit o mag-submit ng wishlist. Pakicontact ang admin kung may problema.",
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
      // invalid/empty body — validation below returns the proper error
    }

    const result = validateWishes(body.wishes);
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    const wishes = result.wishes;

    const data = {
      wish1Name: wishes[0]?.name ?? null,
      wish1Details: wishes[0]?.details ?? null,
      wish2Name: wishes[1]?.name ?? null,
      wish2Details: wishes[1]?.details ?? null,
      wish3Name: wishes[2]?.name ?? null,
      wish3Details: wishes[2]?.details ?? null,
      submittedAt: new Date(),
    };

    const existing = await db.wishlist.findUnique({
      where: { participantId: participant.id },
    });

    let row;
    let updated: boolean;
    if (existing) {
      row = await db.wishlist.update({
        where: { participantId: participant.id },
        data,
      });
      updated = true;
      await audit(participant.identityCode, "WISHLIST_UPDATE");
    } else {
      row = await db.wishlist.create({
        data: { participantId: participant.id, ...data },
      });
      updated = false;
      await audit(
        participant.identityCode,
        "WISHLIST_SUBMIT",
        `Wishlist with ${wishes.length} wish(es) submitted`
      );
    }

    return jsonOk({ wishlist: wishlistDto(row), updated });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
