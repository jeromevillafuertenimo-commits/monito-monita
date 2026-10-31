export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidSex, resolveColor, resolveWord } from "@/lib/words";

/** GET /api/code-check?sex=&color=&word= — is this identity code still free?
 * Returns only {available}; never lists other participants' codes. */
export async function GET(request: Request) {
  try {
    const rl = rateLimit(`codecheck:${clientIp(request)}`, 60, 60_000);
    if (!rl.ok) return jsonError("Sobrang dami ng check. Maghintay sandali.", 429);
    const url = new URL(request.url);
    const sex = url.searchParams.get("sex") ?? "";
    const color = resolveColor(url.searchParams.get("color") ?? "");
    const word = isValidSex(sex) ? resolveWord(url.searchParams.get("word") ?? "", sex) : null;
    if (!color || !word) return jsonOk({ valid: false, available: false });
    const identityCode = `${color} ${word}`;
    const taken = await db.participant.findUnique({ where: { codeKey: identityCode.toLowerCase() } });
    return jsonOk({ valid: true, available: !taken, identityCode });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
