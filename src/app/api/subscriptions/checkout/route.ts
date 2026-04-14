import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { getUserById } from "@/db/queries/users";

/**
 * POST /api/subscriptions/checkout
 * Creates a Stripe Checkout Session for the Pro subscription.
 * Requirements: 17.1, 17.8
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "User not found" } },
        { status: 401 }
      );
    }

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: { code: "CONFIGURATION_ERROR", message: "Stripe price not configured" } },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      metadata: {
        userId: user.id,
      },
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard?checkout=canceled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("POST /api/subscriptions/checkout error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create checkout session" } },
      { status: 500 }
    );
  }
}
