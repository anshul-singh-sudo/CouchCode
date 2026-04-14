import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { gameSessions } from "@/db/schema/sessions";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin role required" } },
        { status: 403 }
      );
    }

    const [gameSession] = await db
      .select({ id: gameSessions.id, status: gameSessions.status })
      .from(gameSessions)
      .where(eq(gameSessions.code, params.code))
      .limit(1);

    if (!gameSession) {
      return NextResponse.json(
        { error: { code: "SESSION_NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    if (gameSession.status === "ended") {
      return NextResponse.json(
        { error: { code: "SESSION_ALREADY_ENDED", message: "Session already ended" } },
        { status: 409 }
      );
    }

    // Mark session as ended
    await db
      .update(gameSessions)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(gameSessions.code, params.code));

    // Note: In production, this would also send a WS message to the signaling server
    // to disconnect all devices. The WS server URL would be called here.
    // e.g. await fetch(`${process.env.WS_SERVER_URL}/admin/terminate/${params.code}`, { method: 'POST' })

    return NextResponse.json({ success: true, code: params.code });
  } catch (err) {
    console.error("DELETE /api/admin/sessions/[code] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to terminate session" } },
      { status: 500 }
    );
  }
}
