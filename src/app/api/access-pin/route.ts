export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { buildAccessResult, getSettingsOrSeed, jsonError, jsonOk } from "@/lib/api-utils";
import { generateAccessToken, hashPin, hashToken, isValidPin, normalizePin } from "@/lib/auth";
import { normalizeWhitespace } from "@/lib/validation";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

// Brute-force protection: a 6-digit PIN is low-entropy, so attempts are
// strictly limited per IP. 8 tries per 10 minutes is plenty for humans.
const PIN_ATTEMPTS_LIMIT = 8;
const PIN_WINDOW_MS = 10 * 60 * 1000;

/**
 * POST /api/access-pin — participant sign-in with First name + Last name +
 * their personal 6-digit PIN. The name must match the registered participant
 * (case-insensitive), adding a human-friendly second factor on top of the PIN.
 * On success, issues a fresh ephemeral session token (only its SHA-256 is
 * stored, in `sessionTokenHash`). Real names are never returned; the
 * assignment is included ONLY when released.
 *
 * SECURITY: the same generic error is returned whether the name does not
 * exist or the PIN is wrong — no account enumeration.
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // invalid/empty body — handled by the empty-field checks below
    }

    const ip = clientIp(request);
    const firstName = normalizeWhitespace(typeof body.firstName === "string" ? body.firstName : "");
    const lastName = normalizeWhitespace(typeof body.lastName === "string" ? body.lastName : "");
    const pin = normalizePin(typeof body.pin === "string" ? body.pin : "");

    if (!firstName || !lastName) {
      return jsonError("Pakilagay ang First name at Last name mo.", 400);
    }
    if (!isValidPin(pin)) {
      return jsonError("Pakicomplete ang 6-digit PIN mo (numbers lang, eksaktong 6 digits).", 400);
    }

    const rl = rateLimit(`pin:${ip}`, PIN_ATTEMPTS_LIMIT, PIN_WINDOW_MS);
    if (!rl.ok) {
      return jsonError(
        `Masyado nang maraming attempts. Pakisubok muli pagkatapos ng ${Math.ceil(
          rl.retryAfterSec / 60
        )} minuto o humingi ng tulong sa admin.`,
        429
      );
    }

    // Match the participant by their registered name, then verify the PIN.
    // (nameKey is the lowercased "first last" stored at registration.)
    const nameKey = `${firstName} ${lastName}`.toLowerCase();
    const participant = await db.participant.findUnique({
      where: { nameKey },
      include: { wishlist: true },
    });
    // One generic message for: unknown name, wrong PIN, or PIN never set.
    if (!participant || !participant.pinHash || participant.pinHash !== hashPin(pin)) {
      return jsonError(
        "Hindi tama ang First name, Last name, o PIN. Pakicheck ulit — kung nakalimutan mo ang PIN mo, humingi ng tulong sa admin.",
        401
      );
    }

    const settings = await getSettingsOrSeed();
    if (!settings) {
      return jsonError("May problema sa server. Pakisubok muli.", 500);
    }

    // Issue an ephemeral session token for this sign-in.
    const sessionToken = generateAccessToken();
    await db.participant.update({
      where: { id: participant.id },
      data: { sessionTokenHash: hashToken(sessionToken) },
    });

    resetRateLimit(`pin:${ip}`);

    const released = settings.randomizationStatus === "released";
    const result = await buildAccessResult(participant, released);

    return jsonOk({
      ...result,
      token: sessionToken,
      submissionsLocked: settings.submissionsLocked,
    });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
