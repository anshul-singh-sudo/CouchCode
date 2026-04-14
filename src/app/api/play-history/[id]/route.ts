import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { playHistory } from "@/db/schema/activity";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id ?? null;

    const body = await req.json();
    const { durationSeconds } = body as { durationSeconds: number };

    if (typeof durationSeconds !== "number" || durationSeconds < 0) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "durationSeconds must be a non-negative number" } },
        { status: 400 }
      );
    }

    const { id } = params;

    // Build where clause — guests have null userId so match by id only
    const whereClause = userId
      ? and(eq(playHistory.id, id), eq(playHistory.userId, userId))
      : eq(playHistory.id, id);

    const [updated] = await db
      .update(playHistory)
      .set({ durationSeconds })
      .where(whereClause)
      .returning({ id: playHistory.id });

    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Play history record not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/play-history/[id] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update play history" } },
      { status: 500 }
    );
  }
}
