"use client";

import Image from "next/image";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import { usePlayHistory, type PlayHistoryEntry } from "@/hooks/usePlayHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Calculate most played games from play history */
function getMostPlayed(
  history: PlayHistoryEntry[]
): { gameId: string; gameTitle: string; gameSlug: string; totalSeconds: number }[] {
  const map = new Map<
    string,
    { gameId: string; gameTitle: string; gameSlug: string; totalSeconds: number }
  >();
  for (const entry of history) {
    const existing = map.get(entry.gameId);
    if (existing) {
      existing.totalSeconds += entry.durationSeconds ?? 0;
    } else {
      map.set(entry.gameId, {
        gameId: entry.gameId,
        gameTitle: entry.gameTitle,
        gameSlug: entry.gameSlug,
        totalSeconds: entry.durationSeconds ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
}

interface Props {
  userId: string;
  initialHistory: PlayHistoryEntry[];
}

export default function DashboardClient({ initialHistory }: Props) {
  const { data: favData, isLoading: favLoading } = useFavorites();
  const { data: histData } = usePlayHistory();

  // Use server-fetched initial data, fall back to client-fetched
  const history = histData?.history ?? initialHistory;
  const mostPlayed = getMostPlayed(history);

  return (
    <div className="space-y-10">
      {/* Recent Games */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No play history yet. Start playing to see your recent games here.
          </p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  {entry.gameCoverArtPath ? (
                    <Image
                      src={entry.gameCoverArtPath}
                      alt={entry.gameTitle}
                      fill
                      className="object-cover"
                      sizes="40px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      {entry.gameSystem.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/games/${entry.gameSlug}`}
                    className="font-medium text-sm hover:underline truncate block"
                  >
                    {entry.gameTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.playedAt)} · {formatDuration(entry.durationSeconds)}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {entry.gameSystem.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Most Played */}
      {mostPlayed.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Most Played</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mostPlayed.slice(0, 6).map((game, i) => (
              <div
                key={game.gameId}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <span className="text-2xl font-bold text-muted-foreground w-8 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/games/${game.gameSlug}`}
                    className="font-medium text-sm hover:underline truncate block"
                  >
                    {game.gameTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(game.totalSeconds)} total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Favorites */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Favorites</h2>
        {favLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : !favData?.favorites.length ? (
          <p className="text-muted-foreground text-sm">
            No favorites yet.{" "}
            <Link href="/games" className="underline">
              Browse games
            </Link>{" "}
            and heart the ones you love.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {favData.favorites.map((fav) => (
              <Link
                key={fav.gameId}
                href={`/games/${fav.slug}`}
                className="group block space-y-2"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {fav.coverArtPath ? (
                    <Image
                      src={fav.coverArtPath}
                      alt={fav.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                      No Art
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm line-clamp-2 group-hover:underline">
                    {fav.title}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {fav.system.toUpperCase()}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Play History (full list) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Play History</h2>
          <span className="text-sm text-muted-foreground">
            {history.length} session{history.length !== 1 ? "s" : ""}
          </span>
        </div>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No play history yet.</p>
        ) : (
          <div className="space-y-1">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors text-sm"
              >
                <span className="flex-1 font-medium truncate">
                  <Link href={`/games/${entry.gameSlug}`} className="hover:underline">
                    {entry.gameTitle}
                  </Link>
                </span>
                <span className="text-muted-foreground text-xs w-20 text-right">
                  {formatDuration(entry.durationSeconds)}
                </span>
                <span className="text-muted-foreground text-xs w-28 text-right">
                  {formatDate(entry.playedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="pt-4">
        <Button asChild variant="outline">
          <Link href="/games">Browse Games</Link>
        </Button>
      </div>
    </div>
  );
}
