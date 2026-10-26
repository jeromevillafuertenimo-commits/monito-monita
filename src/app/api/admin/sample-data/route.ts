export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSettingsOrSeed, jsonError, jsonOk, requireAdmin } from "@/lib/api-utils";
import { audit, hashPin, randomSixDigitPin } from "@/lib/auth";
import { COLORS, FLOWERS, ANIMALS } from "@/lib/words";

// 9 sample participants (5 male, 4 female) — clearly Filipino sample names.
const SAMPLE_PEOPLE = [
  { firstName: "Juan", lastName: "Dela Cruz", sex: "male" },
  { firstName: "Jose", lastName: "Rizal", sex: "male" },
  { firstName: "Andres", lastName: "Bonifacio", sex: "male" },
  { firstName: "Emilio", lastName: "Aguinaldo", sex: "male" },
  { firstName: "Carlos", lastName: "Yulo", sex: "male" },
  { firstName: "Maria", lastName: "Santos", sex: "female" },
  { firstName: "Corazon", lastName: "Aquino", sex: "female" },
  { firstName: "Andrea", lastName: "Bautista", sex: "female" },
  { firstName: "Lea", lastName: "Salonga", sex: "female" },
] as const;

// Realistic wishlist items within the ₱150–₱200 budget, one per wishlist holder.
const SAMPLE_WISHES = [
  { name: "Tumbler 500ml", details: "Insulated, dark green" },
  { name: "T-shirt", details: "Size M, black plain" },
  { name: "Journal notebook", details: "A5, dotted" },
  { name: "Candle", details: "Vanilla scent" },
  { name: "Mug", details: "Ceramic, forest green" },
  { name: "Socks set", details: "Size 39-42, dark colors" },
  { name: "Chocolate box", details: "Any brand, 150-180 pesos" },
  { name: "Photo frame", details: "4R, wooden" },
];

const MANAGE_BLOCKED_MESSAGE =
  "Hindi na pwedeng mag-manage ng sample data dahil naka-lock na ang submissions o may randomization na.";

/** Common guard for both handlers: admin session + mutable event state. */
async function guard() {
  const admin = await requireAdmin();
  if (!admin) {
    return { admin: null, blocked: jsonError("Kailangan mag-login muna bilang admin.", 401) };
  }
  const settings = await getSettingsOrSeed();
  if (!settings) {
    return { admin: null, blocked: jsonError("May problema sa server. Pakisubok muli.", 500) };
  }
  if (settings.submissionsLocked || settings.randomizationStatus !== "not_started") {
    return { admin: null, blocked: jsonError(MANAGE_BLOCKED_MESSAGE, 400) };
  }
  return { admin, blocked: null };
}

/** POST /api/admin/sample-data — generate 9 sample participants (8 with wishlists). */
export async function POST() {
  try {
    const { admin, blocked } = await guard();
    if (!admin || blocked) return blocked;

    const existing = await db.participant.findMany({
      select: { codeKey: true, nameKey: true, pin: true },
    });
    const takenCodes = new Set(existing.map((p) => p.codeKey));
    const takenNames = new Set(existing.map((p) => p.nameKey));
    const takenPins = new Set(existing.map((p) => p.pin).filter(Boolean) as string[]);

    // Globally-unique random 6-digit PIN for each sample participant.
    // Returns BOTH the plain PIN (admin-visible) and its peppered hash.
    const nextPin = (): { pin: string; pinHash: string } => {
      for (let i = 0; i < 100; i++) {
        const pin = randomSixDigitPin();
        if (!takenPins.has(pin)) {
          takenPins.add(pin);
          return { pin, pinHash: hashPin(pin) };
        }
      }
      const fallback = randomSixDigitPin();
      return { pin: fallback, pinHash: hashPin(fallback) }; // practically unreachable
    };

    // Cycling cursor over COLORS × FLOWERS/ANIMALS; skips taken codeKeys.
    let colorOffset = 0;
    let wordOffset = 0;
    const nextCode = (sex: string) => {
      const words = sex === "female" ? FLOWERS : ANIMALS;
      const total = COLORS.length * words.length;
      for (let i = 0; i < total; i++) {
        const color = COLORS[(colorOffset + i) % COLORS.length];
        const word = words[(wordOffset + i) % words.length];
        const identityCode = `${color} ${word}`;
        const codeKey = identityCode.toLowerCase();
        if (!takenCodes.has(codeKey)) {
          takenCodes.add(codeKey);
          colorOffset = (colorOffset + i + 1) % COLORS.length;
          wordOffset = (wordOffset + i + 1) % words.length;
          return { color, word, identityCode, codeKey };
        }
      }
      return null;
    };

    let created = 0;
    let wishIndex = 0;

    for (const person of SAMPLE_PEOPLE) {
      const nameKey = `${person.firstName} ${person.lastName}`.toLowerCase();
      if (takenNames.has(nameKey)) continue; // never collide with a real registrant

      const code = nextCode(person.sex);
      if (!code) break;

      try {
        const generatedPin = nextPin();
        const participant = await db.participant.create({
          data: {
            firstName: person.firstName,
            lastName: person.lastName,
            nameKey,
            sex: person.sex,
            codeColor: code.color,
            codeWord: code.word,
            identityCode: code.identityCode,
            codeKey: code.codeKey,
            pinHash: generatedPin.pinHash,
            pin: generatedPin.pin,
            isSample: true,
          },
        });
        created++;

        // Emilio Aguinaldo deliberately has NO wishlist (pending demo).
        const isPendingDemo =
          person.firstName === "Emilio" && person.lastName === "Aguinaldo";
        if (!isPendingDemo) {
          const wish = SAMPLE_WISHES[wishIndex % SAMPLE_WISHES.length];
          wishIndex++;
          await db.wishlist.create({
            data: {
              participantId: participant.id,
              wish1Name: wish.name,
              wish1Details: wish.details,
            },
          });
        }
      } catch {
        // Rare unique collision — skip this one and continue with the rest.
      }
    }

    await audit(admin.username, "SAMPLE_DATA_GENERATED", `${created} sample participants created`);
    return jsonOk({ created });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}

/** DELETE /api/admin/sample-data — remove all sample participants (cascades). */
export async function DELETE() {
  try {
    const { admin, blocked } = await guard();
    if (!admin || blocked) return blocked;

    const result = await db.participant.deleteMany({ where: { isSample: true } });

    await audit(
      admin.username,
      "SAMPLE_DATA_DELETED",
      `${result.count} sample participants deleted`
    );

    return jsonOk({ deleted: result.count });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
