import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { subscriptions } from "@/db/schema/payments";
import { eq } from "drizzle-orm";

/**
 * POST /api/subscriptions/portal
 * Creates a Stripe Customer Portal session for subscription management.
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

    // Find the user's active subscription to get the Stripe customer ID
    const [subscription] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id))
      .limit(1);

    if (!subscription) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No subscription found" } },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("POST /api/subscriptions/portal error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create portal session" } },
      { status: 500 }
    );
  }
}
