// Server-only security helpers: password hashing (scrypt), HMAC-signed admin
// sessions, high-entropy ephemeral session tokens (stored as SHA-256 hash),
// and peppered 6-digit PIN hashing for the name + PIN participant sign-in.
import "server-only";
import {
  createHmac,
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { db } from "@/lib/db";

const SESSION_COOKIE = "mm_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "monito-monita-dev-secret-change-me";
}

// ---------- Admin passwords (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ---------- Admin session tokens (HMAC-signed) ----------

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signAdminSession(username: string): string {
  const payload = b64url(JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_MS }));
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminSession(token: string | undefined): { username: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      u: string;
      exp: number;
    };
    if (!data.u || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE_NAME = SESSION_COOKIE;
export const ADMIN_COOKIE_MAX_AGE = SESSION_TTL_MS / 1000;

// ---------- Participant session tokens ----------

/** High-entropy URL-safe session token; the client keeps it in memory/
 * sessionStorage and only its SHA-256 is stored server-side. */
export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---------- Participant 6-digit PINs ----------

function pinPepper(): string {
  return process.env.PIN_PEPPER || process.env.ADMIN_SESSION_SECRET || "mm-pin-pepper-change-me";
}

/**
 * Deterministic peppered hash of a 6-digit PIN. Deterministic so the DB
 * unique constraint can enforce globally-unique PINs; peppered so a leaked
 * DB cannot be matched against generic rainbow tables.
 */
export function hashPin(pin: string): string {
  return createHmac("sha256", pinPepper()).update(`mm-pin:${pin}`).digest("hex");
}

/** Normalizes a PIN input: digits only, trimmed. */
export function normalizePin(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/** Cryptographically random 6-digit PIN as a zero-padded string. */
export function randomSixDigitPin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// ---------- Lazy seeding (admin account + event settings) ----------

let seeded = false;

export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  await db.eventSettings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });
  const count = await db.adminAccount.count();
  if (count === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "fafbCF2026";
    await db.adminAccount.create({
      data: { username, passwordHash: hashPassword(password) },
    });
    await db.auditLog.create({
      data: {
        actor: "system",
        action: "SEED_ADMIN",
        details: `Default admin account na-created (${username}). Pak Palitan ang password sa Settings.`,
      },
    });
  }
  seeded = true;
}

export async function getSettings() {
  await ensureSeed();
  return db.eventSettings.findUnique({ where: { id: "main" } });
}

// ---------- Audit log ----------

export async function audit(
  actor: string,
  action: string,
  details?: string,
  recordId?: string
): Promise<void> {
  try {
    await db.auditLog.create({
      data: { actor, action, details: details ?? null, recordId: recordId ?? null },
    });
  } catch {
    // Audit logging must never break the main flow.
  }
}

/** Secure random integer in [0, max) — used for sample data generation. */
export function pickRandom<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length)];
}
