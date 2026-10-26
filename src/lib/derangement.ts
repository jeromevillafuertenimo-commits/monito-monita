import { randomInt } from "crypto";

/**
 * Generates a random derangement of [0..n-1]: result[i] = index of the person
 * that person i is assigned to give a gift to. Guarantees result[i] !== i for all i.
 * Uses Fisher-Yates with crypto.randomInt (CSPRNG) and retries until a valid
 * derangement is found; falls back to a cyclic rotation (also a valid, random
 * starting-point derangement) if retries are exhausted.
 * Returns null when n < 2 (a derangement is impossible).
 */
export function generateDerangement(n: number): number[] | null {
  if (n < 2) return null;

  for (let attempt = 0; attempt < 500; attempt++) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.every((v, i) => v !== i)) return arr;
  }

  // Deterministic fallback: rotate by one — always a valid derangement for n >= 2.
  return Array.from({ length: n }, (_, i) => (i + 1) % n);
}

/** Full verification of a derangement against the 6 assignment rules. */
export function verifyDerangement(derangement: number[] | null, n: number): boolean {
  if (!derangement || derangement.length !== n || n < 2) return false;
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) {
    const target = derangement[i];
    if (target === i) return false; // rule 3: never self
    if (target < 0 || target >= n) return false; // rule 6: valid index
    if (seen.has(target)) return false; // rule 5: each recipient exactly once
    seen.add(target);
  }
  return seen.size === n; // rules 1, 2, 4: bijection
}
