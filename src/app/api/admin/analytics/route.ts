import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { games } from "@/db/schema/games";
import { gameSessions, sessionDevices } from "@/db/schema/sessions";
import { playHistory, adImpressions } from "@/db/schema/activity";
import { subscriptions } from "@/db/schema/payments";
import { and, eq, gte, sql, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin role required" } },
        { status: 403 }
      );
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // DAU — distinct users with play history today
    const [dauRow] = await db
      .select({ count: sql<number>`count(distinct ${playHistory.userId})::int` })
      .from(playHistory)
      .where(gte(playHistory.playedAt, startOfDay));
    const dau = dauRow?.count ?? 0;

    // MAU — distinct users with play history in last 30 days
    const [mauRow] = await db
      .select({ count: sql<number>`count(distinct ${playHistory.userId})::int` })
      .from(playHistory)
      .where(gte(playHistory.playedAt, thirtyDaysAgo));
    const mau = mauRow?.count ?? 0;

    // Active sessions count
    const [activeSessionsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gameSessions)
      .where(eq(gameSessions.status, "active"));
    const activeSessions = activeSessionsRow?.count ?? 0;

    // MRR — sum of active subscriptions (assuming $9.99/month = 999 cents)
    const [activeSubsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));
    const activeSubsCount = activeSubsRow?.count ?? 0;
    const mrr = activeSubsCount * 999; // cents

    // Total revenue — all active + past subscriptions (simplified)
    const [totalSubsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions);
    const totalRevenue = (totalSubsRow?.count ?? 0) * 999;

    // New subscriptions this month
    const [newSubsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(gte(subscriptions.startDate, startOfMonth));
    const newSubs = newSubsRow?.count ?? 0;

    // Churn — canceled this month
    const [churnRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "canceled"),
          gte(subscriptions.updatedAt, startOfMonth)
        )
      );
    const churnedSubs = churnRow?.count ?? 0;
    const churnRate = activeSubsCount > 0
      ? Math.round((churnedSubs / (activeSubsCount + churnedSubs)) * 10000) / 100
      : 0;

    // Top 10 games by total plays
    const topGames = await db
      .select({ id: games.id, title: games.title, system: games.system, totalPlays: games.totalPlays })
      .from(games)
      .orderBy(desc(games.totalPlays))
      .limit(10);

    // Device breakdown — from session_devices role (simplified: count by device token prefix)
    // We use play_history joined with game_sessions to approximate device type
    // Since we don't store device type, we'll return placeholder data
    const deviceBreakdown = [
      { type: "desktop", count: 0 },
      { type: "mobile", count: 0 },
      { type: "tablet", count: 0 },
    ];

    // Mode breakdown — from game_sessions
    const modeRows = await db
      .select({
        mode: gameSessions.mode,
        count: sql<number>`count(*)::int`,
      })
      .from(gameSessions)
      .groupBy(gameSessions.mode)
      .orderBy(gameSessions.mode);

    const modeBreakdown = modeRows.map((r) => ({
      mode: `Mode ${r.mode}`,
      count: r.count,
    }));

    // Ad impressions
    const [adImpressionsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adImpressions);
    const totalAdImpressions = adImpressionsRow?.count ?? 0;
    // Estimated revenue at $0.002 per impression
    const estimatedAdRevenue = Math.round(totalAdImpressions * 0.2); // cents

    // DAU trend — last 7 days
    const dauTrend = await db
      .select({
        date: sql<string>`date_trunc('day', ${playHistory.playedAt})::date::text`,
        count: sql<number>`count(distinct ${playHistory.userId})::int`,
      })
      .from(playHistory)
      .where(gte(playHistory.playedAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)))
      .groupBy(sql`date_trunc('day', ${playHistory.playedAt})`)
      .orderBy(sql`date_trunc('day', ${playHistory.playedAt})`);

    return NextResponse.json({
      dau,
      mau,
      activeSessions,
      mrr,
      totalRevenue,
      newSubs,
      churnRate,
      topGames,
      deviceBreakdown,
      modeBreakdown,
      adImpressions: totalAdImpressions,
      estimatedAdRevenue,
      dauTrend,
    });
  } catch (err) {
    console.error("GET /api/admin/analytics error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch analytics" } },
      { status: 500 }
    );
  }
}
