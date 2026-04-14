import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { subscriptions, gamePurchases } from "@/db/schema/payments";
import { updateUser } from "@/db/queries/users";
import { eq, and } from "drizzle-orm";
import { users } from "@/db/schema/users";
import { games } from "@/db/schema/games";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events.
 * Requirements: 17.2, 17.3, 17.5, 17.6, 17.7, 20.3, 20.7
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "invoice.payment_failed": {
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "payment_intent.succeeded": {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }
      default:
        // Unhandled event type — ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * checkout.session.completed:
 * Insert subscriptions record, set users.subscriptionTier = 'pro'
 * Requirements: 17.2, 17.3
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("checkout.session.completed: missing userId in metadata");
    return;
  }

  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;

  // Fetch the subscription from Stripe to get status and dates
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  await db.insert(subscriptions).values({
    userId,
    plan: "pro",
    status: stripeSub.status,
    startDate: new Date(stripeSub.current_period_start * 1000),
    endDate: new Date(stripeSub.current_period_end * 1000),
    stripeSubscriptionId,
    stripeCustomerId,
  }).onConflictDoUpdate({
    target: subscriptions.stripeSubscriptionId,
    set: {
      status: stripeSub.status,
      updatedAt: new Date(),
    },
  });

  await updateUser(userId, { subscriptionTier: "pro" });
}

/**
 * invoice.payment_failed:
 * Set subscriptions.status = 'past_due'
 * Requirements: 17.5
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoice.subscription as string;
  if (!stripeSubscriptionId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  // Notify user — in production this would send an email
  console.log(`Payment failed for subscription ${stripeSubscriptionId}`);
}

/**
 * customer.subscription.deleted:
 * Set subscriptions.status = 'canceled', revert tier to 'free'
 * Requirements: 17.6, 17.7
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (!sub) return;

  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  await updateUser(sub.userId, { subscriptionTier: "free" });
}

/**
 * payment_intent.succeeded:
 * Insert game_purchases record, grant access
 * Requirements: 20.3, 20.7
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.userId;
  const gameId = paymentIntent.metadata?.gameId;

  if (!userId || !gameId) return;

  await db.insert(gamePurchases).values({
    userId,
    gameId,
    stripePaymentIntentId: paymentIntent.id,
    amountCents: paymentIntent.amount,
  }).onConflictDoNothing();
}
