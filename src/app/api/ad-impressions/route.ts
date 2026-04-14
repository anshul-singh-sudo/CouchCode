import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { adImpressions } from "@/db/schema/activity";

/**
 * POST /api/ad-impressions
 * Records an ad impression row in the database.
 * Requirements: 19.4
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    const { adUnit, gameId } = body as { adUnit: string; gameId?: string };

    if (!adUnit) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "adUnit is required" } },
        { status: 400 }
      );
    }

    await db.insert(adImpressions).values({
      userId: session?.user?.id ?? null,
      gameId: gameId ?? null,
      adUnit,
    });

    return NextResponse.json({ recorded: true });
  } catch (err) {
    console.error("POST /api/ad-impressions error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to record impression" } },
      { status: 500 }
    );
  }
}
