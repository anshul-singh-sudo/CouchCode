import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import GameBrowser from "./GameBrowser";

export const metadata = {
  title: "Game Library — CouchCode",
  description: "Browse and play retro games in your browser",
};

export default function GamesPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Game Library</h1>
        <p className="text-muted-foreground mt-1">
          Browse NES, SNES, GBA, N64, PSP, and PS2 games
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        }
      >
        <GameBrowser />
      </Suspense>
    </main>
  );
}
