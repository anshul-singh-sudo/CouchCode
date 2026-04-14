import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { countSaveStates } from "@/db/queries/saves";
import { generateSignedPutUrl } from "@/lib/r2";
import { db } from "@/db";
import { saveStates } from "@/db/schema/saves";
import { and, eq } from "drizzle-orm";

const FREE_TIER_SAVE_LIMIT = 1; // Req 2.6, 18.3

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { gameId, slotNumber } = body as {
      gameId: string;
      slotNumber: number;
    };

    if (!gameId || slotNumber === undefined) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "gameId and slotNumber are required" } },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const isPro = session.user.subscriptionTier === "pro";

    // Enforce free-tier save state limit (Req 2.6, 18.3)
    if (!isPro) {
      const existingCount = await countSaveStates(userId, gameId);
      // Check if this slot already exists (overwrite is allowed)
      const [existingSlot] = await db
        .select({ id: saveStates.id })
        .from(saveStates)
        .where(
          and(
            eq(saveStates.userId, userId),
            eq(saveStates.gameId, gameId),
            eq(saveStates.slotNumber, slotNumber)
          )
        )
        .limit(1);

      if (!existingSlot && existingCount >= FREE_TIER_SAVE_LIMIT) {
        return NextResponse.json(
          {
            error: {
              code: "SAVE_LIMIT_REACHED",
              message: "Free tier allows only 1 save state per game. Upgrade to Pro for unlimited saves.",
            },
          },
          { status: 409 }
        );
      }
    }

    // Generate R2 paths
    const stateDataPath = `save-states/${userId}/${gameId}/slot-${slotNumber}.bin`;
    const thumbnailPath = `save-states/${userId}/${gameId}/slot-${slotNumber}-thumb.jpg`;

    // Upsert save state record
    await db
      .insert(saveStates)
      .values({
        userId,
        gameId,
        slotNumber,
        stateDataPath,
        thumbnailPath,
      })
      .onConflictDoUpdate({
        target: [saveStates.userId, saveStates.gameId, saveStates.slotNumber],
        set: {
          stateDataPath,
          thumbnailPath,
          createdAt: new Date(),
        },
      });

    // Generate signed PUT URLs for client to upload directly to R2
    const [stateUploadUrl, thumbnailUploadUrl] = await Promise.all([
      generateSignedPutUrl(stateDataPath, "application/octet-stream"),
      generateSignedPutUrl(thumbnailPath, "image/jpeg"),
    ]);

    return NextResponse.json({ stateUploadUrl, thumbnailUploadUrl });
  } catch (err) {
    console.error("POST /api/save-states error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create save state" } },
      { status: 500 }
    );
  }
}
