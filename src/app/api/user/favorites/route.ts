import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { favorites } from "@/db/schema/activity";
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

    const favList = await db
      .select({
        gameId: favorites.gameId,
        createdAt: favorites.createdAt,
        title: games.title,
        slug: games.slug,
        system: games.system,
        genre: games.genre,
        coverArtPath: games.coverArtPath,
        isPremium: games.isPremium,
        isActive: games.isActive,
      })
      .from(favorites)
      .innerJoin(games, eq(favorites.gameId, games.id))
      .where(eq(favorites.userId, session.user.id))
      .orderBy(desc(favorites.createdAt));

    return NextResponse.json({ favorites: favList });
  } catch (err) {
    console.error("GET /api/user/favorites error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch favorites" } },
      { status: 500 }
    );
  }
}
