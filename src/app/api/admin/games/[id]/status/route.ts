import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { games } from "@/db/schema/games";
import { eq } from "drizzle-orm";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
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

    // Fetch current status and toggle it
    const [current] = await db
      .select({ isActive: games.isActive })
      .from(games)
      .where(eq(games.id, params.id))
      .limit(1);

    if (!current) {
      return NextResponse.json(
        { error: { code: "GAME_NOT_FOUND", message: "Game not found" } },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(games)
      .set({ isActive: !current.isActive })
      .where(eq(games.id, params.id))
      .returning({ id: games.id, isActive: games.isActive });

    return NextResponse.json({ game: updated });
  } catch (err) {
    console.error("PATCH /api/admin/games/[id]/status error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to toggle game status" } },
      { status: 500 }
    );
  }
}
