import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { playHistory } from "@/db/schema/activity";
import { games } from "@/db/schema/games";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const history = await db
      .select({
        id: playHistory.id,
        gameId: playHistory.gameId,
        gameTitle: games.title,
        gameSlug: games.slug,
        gameCoverArtPath: games.coverArtPath,
        gameSystem: games.system,
        playedAt: playHistory.playedAt,
        durationSeconds: playHistory.durationSeconds,
      })
      .from(playHistory)
      .innerJoin(games, eq(playHistory.gameId, games.id))
      .where(eq(playHistory.userId, session.user.id))
      .orderBy(desc(playHistory.playedAt))
      .limit(50);

    return NextResponse.json({ history });
  } catch (err) {
    console.error("GET /api/user/play-history error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch play history" } },
      { status: 500 }
    );
  }
}
