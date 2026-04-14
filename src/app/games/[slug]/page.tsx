import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getGameBySlug } from "@/db/queries/games";
import { getServerSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { favorites } from "@/db/schema/activity";
import { gamePurchases } from "@/db/schema/payments";
import { and, eq } from "drizzle-orm";
import GameDetailActions from "./GameDetailActions";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGameBySlug(params.slug);
  if (!game) return { title: "Game Not Found — CouchCode" };
  return {
    title: `${game.title} — CouchCode`,
    description: game.description ?? `Play ${game.title} on CouchCode`,
    openGraph: {
      title: game.title,
      description: game.description ?? undefined,
      images: game.coverArtPath ? [game.coverArtPath] : [],
    },
  };
}

export default async function GameDetailPage({ params }: Props) {
  const game = await getGameBySlug(params.slug);
  const session = await getServerSession();
  const isAdmin = session?.user?.role === "admin";

  if (!game || (!isAdmin && !game.isActive)) {
    notFound();
  }

  // Check if user has favorited this game
  let isFavorited = false;
  let hasPurchased = false;

  if (session?.user?.id) {
    const [fav] = await db
      .select({ userId: favorites.userId })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          eq(favorites.gameId, game.id)
        )
      )
      .limit(1);
    isFavorited = !!fav;

    if (game.isPremium) {
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
      hasPurchased = !!purchase;
    }
  }

  const isPro = session?.user?.subscriptionTier === "pro";
  const canPlay = !game.isPremium || isPro || hasPurchased;

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Cover art */}
        <div className="md:col-span-1">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
            {game.coverArtPath ? (
              <Image
                src={game.coverArtPath}
                alt={game.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No Cover Art
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{game.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{game.system.toUpperCase()}</Badge>
                <Badge variant="outline">{game.genre}</Badge>
                {game.isPremium ? (
                  <Badge variant="secondary">Premium</Badge>
                ) : (
                  <Badge variant="default">Free</Badge>
                )}
                {!game.isActive && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </div>
          </div>

          {game.description && (
            <p className="text-muted-foreground leading-relaxed">
              {game.description}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {game.releaseYear && (
              <>
                <dt className="text-muted-foreground">Release Year</dt>
                <dd className="font-medium">{game.releaseYear}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Players</dt>
            <dd className="font-medium">
              {game.playerCount === 1 ? "1 Player" : `Up to ${game.playerCount} Players`}
            </dd>
            <dt className="text-muted-foreground">Total Plays</dt>
            <dd className="font-medium">{game.totalPlays.toLocaleString()}</dd>
            {game.isPremium && game.price && (
              <>
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium">${(game.price / 100).toFixed(2)}</dd>
              </>
            )}
          </dl>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {canPlay ? (
              <Button asChild size="lg">
                <Link href={`/play/${game.slug}`}>Play Now</Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" disabled>
                Play Now
              </Button>
            )}

            {game.isPremium && !hasPurchased && !isPro && (
              <Button size="lg" variant="secondary" asChild>
                <Link href={`/purchases/${game.id}`}>
                  Buy — ${game.price ? (game.price / 100).toFixed(2) : "N/A"}
                </Link>
              </Button>
            )}

            {session?.user && (
              <GameDetailActions
                gameId={game.id}
                isFavorited={isFavorited}
              />
            )}
          </div>

          {!canPlay && game.isPremium && (
            <p className="text-sm text-muted-foreground">
              This is a premium game.{" "}
              <Link href="/dashboard" className="underline">
                Upgrade to Pro
              </Link>{" "}
              or purchase individually to play.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
