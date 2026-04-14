import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getGameBySlug } from "@/db/queries/games";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession();
    const isAdmin = session?.user?.role === "admin";

    const game = await getGameBySlug(params.slug);

    if (!game) {
      return NextResponse.json(
        { error: { code: "GAME_NOT_FOUND", message: "Game not found" } },
        { status: 404 }
      );
    }

    // Non-admins cannot see inactive games
    if (!isAdmin && !game.isActive) {
      return NextResponse.json(
        { error: { code: "GAME_NOT_FOUND", message: "Game not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ game });
  } catch (err) {
    console.error("GET /api/games/[slug] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch game" } },
      { status: 500 }
    );
  }
}
