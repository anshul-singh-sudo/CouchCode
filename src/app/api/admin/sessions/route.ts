import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { gameSessions, sessionDevices } from "@/db/schema/sessions";
import { games } from "@/db/schema/games";
import { users } from "@/db/schema/users";
import { eq, sql } from "drizzle-orm";

export async function GET(_req: NextRequest) {
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

    const activeSessions = await db
      .select({
        id: gameSessions.id,
        code: gameSessions.code,
        mode: gameSessions.mode,
        status: gameSessions.status,
        createdAt: gameSessions.createdAt,
        gameTitle: games.title,
        gameSystem: games.system,
        hostUsername: users.username,
        deviceCount: sql<number>`(
          SELECT count(*)::int FROM session_devices sd
          WHERE sd.session_id = ${gameSessions.id}
          AND sd.disconnected_at IS NULL
        )`,
      })
      .from(gameSessions)
      .leftJoin(games, eq(gameSessions.gameId, games.id))
      .leftJoin(users, eq(gameSessions.hostUserId, users.id))
      .where(eq(gameSessions.status, "active"))
      .orderBy(gameSessions.createdAt);

    const now = Date.now();
    const sessionsWithDuration = activeSessions.map((s) => ({
      ...s,
      durationSeconds: Math.floor((now - new Date(s.createdAt).getTime()) / 1000),
    }));

    return NextResponse.json({ sessions: sessionsWithDuration });
  } catch (err) {
    console.error("GET /api/admin/sessions error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch sessions" } },
      { status: 500 }
    );
  }
}
