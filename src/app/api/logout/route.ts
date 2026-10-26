export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";

/**
 * POST /api/logout — participant log out (Bearer session token).
 *
 * Invalidates the ephemeral session token (sessionTokenHash) so the viewer
 * must sign in again with their First name, Last name, and 6-digit PIN on
 * the next visit. Always returns 200 (no information leak).
 */
export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization") || "";
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const hash = hashToken(token);
      const participant = await db.participant.findUnique({
        where: { sessionTokenHash: hash },
        select: { id: true },
      });
      if (participant) {
        await db.participant.update({
          where: { id: participant.id },
          data: { sessionTokenHash: null },
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Even on server trouble the client clears its own session anyway.
    return NextResponse.json({ ok: true });
  }
}
