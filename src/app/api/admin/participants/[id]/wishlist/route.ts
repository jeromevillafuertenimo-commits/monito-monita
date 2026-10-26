export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit } from "@/lib/auth";
import { validateWishes } from "@/lib/validation";

/**
 * PUT /api/admin/participants/[id]/wishlist — admin sets (or fixes) the
 * wishlist of an EXISTING participant. Rescue path para sa mga
 * huliang pasok: kapag naka-lock na ang submissions, ito na lang ang tanging
 * paraan para makapagbigay ng wishlist — kung wala silang nito, hindi
 * makakatakbo ang randomization.
 *
 * Allowed only while randomization has NOT started yet (editing wishes after
 * the draw would silently change what recipients see).
 */
export async function PUT(
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
      return jsonError(
        "Hindi na puwedeng i-edit ang wishlist dahil tapos na ang bunutan.",
        400
      );
    }

    const { id } = await params;
    const participant = await db.participant.findUnique({ where: { id } });
    if (!participant) {
      return jsonError("Hindi nahanap ang participant.", 404);
    }

    let wishesRaw: unknown = null;
    try {
      const body = (await request.json()) as { wishes?: unknown };
      wishesRaw = body.wishes ?? null;
    } catch {
      return jsonError("Pakilagay ang wishlist items.", 400);
    }
    const parsed = validateWishes(wishesRaw);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    const wishes = parsed.wishes; // 1..3 wishes with names (server-validated)

    const data = {
      wish1Name: wishes[0]?.name ?? null,
      wish1Details: wishes[0]?.details ?? null,
      wish2Name: wishes[1]?.name ?? null,
      wish2Details: wishes[1]?.details ?? null,
      wish3Name: wishes[2]?.name ?? null,
      wish3Details: wishes[2]?.details ?? null,
    };

    await db.wishlist.upsert({
      where: { participantId: participant.id },
      update: data,
      create: { participantId: participant.id, ...data },
    });

    await audit(
      admin.username,
      "PARTICIPANT_WISHLIST_SET",
      `Admin set ${wishes.length} wishlist item(s) for ${participant.identityCode} (${participant.firstName} ${participant.lastName})`,
      participant.id
    );

    return jsonOk({ ok: true, identityCode: participant.identityCode, wishCount: wishes.length });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
