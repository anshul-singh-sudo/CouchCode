import { NextRequest, NextResponse } from "next/server";
import { generateSessionCode } from "@/lib/sessionCode";
import { createSession, getSession } from "@/db/queries/sessions";
import { sessionRateLimit } from "@/lib/rateLimit";

// POST /api/sessions — create a new session
export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const { success, reset } = await sessionRateLimit.limit(ip);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many session creation requests", retryAfter } },
      {
        status: 429,
        headers: { "retry-after": String(retryAfter) },
      }
    );
  }

  let body: { gameId?: string; mode?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const { gameId, mode = 1 } = body;
  if (!gameId) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "gameId is required" } },
      { status: 400 }
    );
  }

  // Generate a unique code (retry until not in use)
  let code = generateSessionCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await getSession(code);
    if (!existing || existing.status !== "active") break;
    code = generateSessionCode();
    attempts++;
  }

  const session = await createSession({ code, gameId, mode });

  return NextResponse.json({ code: session.code, sessionId: session.id }, { status: 201 });
}
