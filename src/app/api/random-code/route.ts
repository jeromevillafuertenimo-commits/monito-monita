export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ANIMALS, COLORS, FLOWERS, isValidSex } from "@/lib/words";

/** GET /api/random-code?sex= — a random identity code that nobody has taken yet
 * ("Surprise me"). Returns one suggestion only, never a list of taken codes. */
export async function GET(request: Request) {
  try {
    const rl = rateLimit(`randomcode:${clientIp(request)}`, 40, 60_000);
    if (!rl.ok) return jsonError("Sobrang dami ng try. Maghintay sandali.", 429);
    const sex = new URL(request.url).searchParams.get("sex") ?? "";
    if (!isValidSex(sex)) return jsonError("Piliin muna ang sex.", 400);
    const words = sex === "female" ? FLOWERS : ANIMALS;
    for (let i = 0; i < 25; i++) {
      const color = COLORS[randomInt(0, COLORS.length)];
      const word = words[randomInt(0, words.length)];
      const taken = await db.participant.findUnique({
        where: { codeKey: `${color} ${word}`.toLowerCase() },
        select: { id: true },
      });
      if (!taken) return jsonOk({ color, word });
    }
    return jsonError("Hindi nakahanap ng bakanteng code. Pakisubok muli.", 503);
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
