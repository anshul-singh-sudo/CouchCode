import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { games } from "@/db/schema/games";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user) return { error: "UNAUTHORIZED", status: 401 };
  if (session.user.role !== "admin") return { error: "FORBIDDEN", status: 403 };
  return { session };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json(
        { error: { code: auth.error, message: auth.error } },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const {
      title,
      system,
      genre,
      description,
      releaseYear,
      playerCount,
      isPremium,
      price,
      coverArtPath,
    } = body as {
      title?: string;
      system?: string;
      genre?: string;
      description?: string | null;
      releaseYear?: number | null;
      playerCount?: number;
      isPremium?: boolean;
      price?: number | null;
      coverArtPath?: string | null;
    };

    const updateData: Partial<typeof games.$inferInsert> = {};
    if (title !== undefined) updateData.title = title;
    if (system !== undefined) updateData.system = system;
    if (genre !== undefined) updateData.genre = genre;
    if (description !== undefined) updateData.description = description;
    if (releaseYear !== undefined) updateData.releaseYear = releaseYear;
    if (playerCount !== undefined) updateData.playerCount = playerCount;
    if (isPremium !== undefined) updateData.isPremium = isPremium;
    if (price !== undefined) updateData.price = price;
    if (coverArtPath !== undefined) updateData.coverArtPath = coverArtPath;

    const [updated] = await db
      .update(games)
      .set(updateData)
      .where(eq(games.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: { code: "GAME_NOT_FOUND", message: "Game not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ game: updated });
  } catch (err) {
    console.error("PUT /api/admin/games/[id] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update game" } },
      { status: 500 }
    );
  }
}
