import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getGameBySlug } from "@/db/queries/games";
import { generateSignedGetUrl } from "@/lib/r2";
import { db } from "@/db";
import { gamePurchases } from "@/db/schema/payments";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession();

    // Must be authenticated (registered user or guest with valid session)
    if (!session?.user) {
      // Check for guest token cookie
      const guestToken = req.cookies.get("guest-token");
      if (!guestToken) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 }
        );
      }
    }

    const game = await getGameBySlug(params.slug);

    if (!game || !game.isActive) {
      return NextResponse.json(
        { error: { code: "GAME_NOT_FOUND", message: "Game not found" } },
        { status: 404 }
      );
    }

    // Gate premium games: require Pro tier or individual purchase
    if (game.isPremium && session?.user) {
      const isPro = session.user.subscriptionTier === "pro";

      if (!isPro) {
        // Check individual purchase
        const [purchase] = await db
          .select({ id: gamePurchases.id })
          .from(gamePurchases)
          .where(
            and(
              eq(gamePurchases.userId, session.user.id),
              eq(gamePurchases.gameId, game.id)
            )
          )
          .limit(1);

        if (!purchase) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Pro tier or game purchase required" } },
            { status: 403 }
          );
        }
      }
    } else if (game.isPremium && !session?.user) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Authentication required for premium games" } },
        { status: 403 }
      );
    }

    // Generate signed URL with 1-hour expiry (Req 14.2, 27.1)
    const url = await generateSignedGetUrl(game.romPath, 3600);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("GET /api/games/[slug]/rom-url error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate ROM URL" } },
      { status: 500 }
    );
  }
}
