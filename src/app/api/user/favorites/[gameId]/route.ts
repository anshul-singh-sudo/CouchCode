import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  addFavorite,
  removeFavorite,
  countFavorites,
} from "@/db/queries/favorites";
import { checkFavoritesLimit } from "@/lib/favoritesLimit";

export async function POST(
  _req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { gameId } = params;
    const userId = session.user.id;

    // Enforce 50-favorite limit
    const currentCount = await countFavorites(userId);
    const limitCheck = checkFavoritesLimit(currentCount);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "FAVORITES_LIMIT_REACHED",
            message: limitCheck.error ?? "Favorites limit reached",
          },
        },
        { status: 409 }
      );
    }

    const favorite = await addFavorite(userId, gameId);
    return NextResponse.json({ favorite }, { status: 201 });
  } catch (err: unknown) {
    // Handle duplicate key (already favorited)
    if (
      err instanceof Error &&
      err.message.includes("duplicate key")
    ) {
      return NextResponse.json(
        { error: { code: "ALREADY_FAVORITED", message: "Game already in favorites" } },
        { status: 409 }
      );
    }
    console.error("POST /api/user/favorites/[gameId] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to add favorite" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { gameId } = params;
    await removeFavorite(session.user.id, gameId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/user/favorites/[gameId] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to remove favorite" } },
      { status: 500 }
    );
  }
}
