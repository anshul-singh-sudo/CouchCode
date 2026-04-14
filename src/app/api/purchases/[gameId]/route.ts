import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { games } from "@/db/schema/games";
import { gamePurchases } from "@/db/schema/payments";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/purchases/[gameId]
 * Creates a Stripe Payment Intent for a one-time game purchase.
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.6, 20.7
 */
export async function POST(
  req: NextRequest,
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

    // Fetch the game
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (!game || !game.isActive) {
      return NextResponse.json(
        { error: { code: "GAME_NOT_FOUND", message: "Game not found" } },
        { status: 404 }
      );
    }

    if (!game.isPremium || !game.price) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Game is not available for purchase" } },
        { status: 400 }
      );
    }

    // Check if user already owns this game
    const [existing] = await db
      .select({ id: gamePurchases.id })
      .from(gamePurchases)
      .where(
        and(
          eq(gamePurchases.userId, session.user.id),
          eq(gamePurchases.gameId, gameId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: { code: "ALREADY_PURCHASED", message: "You already own this game" } },
        { status: 409 }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: game.price,
      currency: "usd",
      metadata: {
        userId: session.user.id,
        gameId: game.id,
        gameTitle: game.title,
      },
      description: `CouchCode — ${game.title}`,
    });

    return NextResponse.json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error("POST /api/purchases/[gameId] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create payment intent" } },
      { status: 500 }
    );
  }
}
