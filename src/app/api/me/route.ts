export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  buildAccessResult,
  getSettingsOrSeed,
  jsonError,
  jsonOk,
  participantFromRequest,
  wishlistDto,
} from "@/lib/api-utils";

/** GET /api/me — self profile for the bearer-token participant.
 * Includes the released assignment (if any) so a participant with a live
 * session — e.g. a tab that stayed open since before the release — can see
 * their Monito/Monita without typing their PIN all over again. */
export async function GET(request: Request) {
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
    const released = settings.randomizationStatus === "released";
    const access = await buildAccessResult(participant, released);
    return jsonOk({
      identityCode: access.identityCode,
      sex: participant.sex,
      wishlist: participant.wishlist ? wishlistDto(participant.wishlist) : null,
      submissionsLocked: settings.submissionsLocked,
      released,
      assignment: access.assignment,
      wishlistSubmitted: access.wishlistSubmitted,
    });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
