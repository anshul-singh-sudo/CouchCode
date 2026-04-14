import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { subscriptions } from "@/db/schema/payments";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/subscriptions/status
 * Returns the current user's subscription status.
 * Requirements: 17.1, 17.4
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const [sub] = await db
      .select({
        status: subscriptions.status,
        plan: subscriptions.plan,
        endDate: subscriptions.endDate,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const tier = session.user.subscriptionTier as "free" | "pro";

    return NextResponse.json({
      tier,
      status: sub?.status ?? null,
      renewalDate: sub?.endDate?.toISOString() ?? null,
      plan: sub?.plan ?? null,
    });
  } catch (err) {
    console.error("GET /api/subscriptions/status error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch subscription" } },
      { status: 500 }
    );
  }
}
