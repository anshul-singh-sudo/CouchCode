import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gameSessions, sessionDevices } from "@/db/schema/sessions";
import { getSession } from "@/db/queries/sessions";
import { getServerSession } from "@/lib/session";

// GET /api/sessions/[code] — return session info and device list
export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = await getSession(params.code);
  if (!session) {
    return NextResponse.json(
      { error: { code: "SESSION_NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }

  const devices = await db
    .select()
    .from(sessionDevices)
    .where(eq(sessionDevices.sessionId, session.id));

  return NextResponse.json({ session, devices });
}

// DELETE /api/sessions/[code] — host/admin only, mark session ended
export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const authSession = await getServerSession();

  const session = await getSession(params.code);
  if (!session) {
    return NextResponse.json(
      { error: { code: "SESSION_NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }

  // Only host or admin can end the session
  const isAdmin = authSession?.user?.role === "admin";
  const isHost =
    authSession?.user?.id && session.hostUserId === authSession.user.id;

  if (!isAdmin && !isHost) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only the host or admin can end this session" } },
      { status: 403 }
    );
  }

  await db
    .update(gameSessions)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(gameSessions.id, session.id));

  return NextResponse.json({ success: true });
}
