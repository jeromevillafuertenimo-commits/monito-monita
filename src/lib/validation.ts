// Shared validation helpers (server-safe, no imports from server-only modules).

const NAME_RE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'.-]*$/;

export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function validateName(value: string, label: string): string | null {
  const v = normalizeWhitespace(value);
  if (!v) return `Pakilagay ang iyong ${label}.`;
  if (v.length < 2) return `Ang ${label} ay dapat may hindi bababa sa 2 characters.`;
  if (v.length > 40) return `Ang ${label} ay dapat may 40 characters pababa lang.`;
  if (!NAME_RE.test(v)) return `Ang ${label} ay dapat maglaman ng mga letra lamang (puwedeng may space o hyphen).`;
  return null;
}

export interface WishInput {
  name: string;
  details: string;
}

/** Returns cleaned wishes (1..3) or an error string. At least one wish with a name is required. */
export function validateWishes(
  raw: unknown
): { ok: true; wishes: WishInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Invalid wishlist format. Pakisubmit ulit." };
  }
  if (raw.length === 0) {
    return { ok: false, error: "Kailangan ng kahit isang gift wish. Huwag iwanang blangko ang buong listahan." };
  }
  if (raw.length > 3) {
    return { ok: false, error: "Hanggang tatlong (3) gift wishes lang po ang puwedeng i-submit." };
  }
  const wishes: WishInput[] = [];
  for (const w of raw) {
    if (typeof w !== "object" || w === null) {
      return { ok: false, error: "May mali sa format ng isa sa mga wishes mo." };
    }
    const obj = w as Record<string, unknown>;
    const name = typeof obj.name === "string" ? normalizeWhitespace(obj.name) : "";
    const details = typeof obj.details === "string" ? normalizeWhitespace(obj.details) : "";
    if (name) {
      if (name.length > 80) {
        return { ok: false, error: "Ang gift name ay hanggang 80 characters lang." };
      }
      if (details.length > 200) {
        return { ok: false, error: "Ang gift details ay hanggang 200 characters lang." };
      }
      wishes.push({ name, details });
    } else if (details) {
      return { ok: false, error: "May wish na may details pero walang gift name. Pakilagay ang name ng gift." };
    }
  }
  if (wishes.length === 0) {
    return { ok: false, error: "Kailangan ng kahit isang gift wish na may name." };
  }
  return { ok: true, wishes };
}

export function isStrongEnoughPassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8;
}
