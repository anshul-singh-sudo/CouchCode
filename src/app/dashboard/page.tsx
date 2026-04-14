import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { subscriptions } from "@/db/schema/payments";
import { playHistory } from "@/db/schema/activity";
import { games } from "@/db/schema/games";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import SubscriptionCard from "./SubscriptionCard";
import { AdSlot } from "@/components/ads/AdSlot";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — CouchCode",
};

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/auth");
  }

  const tier = (session.user.subscriptionTier ?? "free") as "free" | "pro";

  // Fetch subscription details server-side
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

  // Fetch recent play history server-side (last 10)
  const recentHistory = await db
    .select({
      id: playHistory.id,
      gameId: playHistory.gameId,
      gameTitle: games.title,
      gameSlug: games.slug,
      gameCoverArtPath: games.coverArtPath,
      gameSystem: games.system,
      playedAt: playHistory.playedAt,
      durationSeconds: playHistory.durationSeconds,
    })
    .from(playHistory)
    .innerJoin(games, eq(playHistory.gameId, games.id))
    .where(eq(playHistory.userId, session.user.id))
    .orderBy(desc(playHistory.playedAt))
    .limit(10);

  const showAds = tier !== "pro";

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.name ?? session.user.email}
        </p>
      </div>

      {showAds && (
        <AdSlot
          showAds={showAds}
          adUnit="dashboard-top"
          className="flex justify-center"
        />
      )}

      <SubscriptionCard
        tier={tier}
        status={sub?.status ?? null}
        renewalDate={sub?.endDate?.toISOString() ?? null}
        plan={sub?.plan ?? null}
      />

      {/* Client sections: Favorites, Save States, Play History */}
      <DashboardClient
        userId={session.user.id}
        initialHistory={recentHistory.map((h) => ({
          ...h,
          playedAt: h.playedAt.toISOString(),
        }))}
      />

      {showAds && (
        <AdSlot
          showAds={showAds}
          adUnit="dashboard-bottom"
          className="flex justify-center"
        />
      )}
    </main>
  );
}
