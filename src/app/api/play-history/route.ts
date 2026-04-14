import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { playHistory } from "@/db/schema/activity";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    // Allow guests (userId can be null)
    const userId = session?.user?.id ?? null;

    const body = await req.json();
    const { gameId, sessionId } = body as {
      gameId: string;
      sessionId?: string;
    };

    if (!gameId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "gameId is required" } },
        { status: 400 }
      );
    }

    const [record] = await db
      .insert(playHistory)
      .values({
        userId,
        gameId,
        sessionId: sessionId ?? null,
        playedAt: new Date(),
      })
      .returning({ id: playHistory.id });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/play-history error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to record play history" } },
      { status: 500 }
    );
  }
}
