"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGames, type GameFilters } from "@/hooks/useGames";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const SYSTEMS = ["nes", "snes", "gba", "n64", "psp", "ps2"] as const;
const GENRES = ["Action", "RPG", "Platformer", "Sports", "Racing", "Puzzle", "Fighting", "Adventure"];
const SORT_OPTIONS = [
  { value: "title", label: "Title (A–Z)" },
  { value: "releaseYear", label: "Release Year" },
  { value: "totalPlays", label: "Most Played" },
] as const;

export default function GameBrowser() {
  const [filters, setFilters] = useState<GameFilters>({
    sort: "title",
    page: 1,
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useGames(filters);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
  }

  function setSystem(system: string | undefined) {
    setFilters((f) => ({ ...f, system, page: 1 }));
  }

  function setGenre(genre: string) {
    setFilters((f) => ({
      ...f,
      genre: genre === "all" ? undefined : genre,
      page: 1,
    }));
  }

  function setSort(sort: string) {
    setFilters((f) => ({
      ...f,
      sort: sort as GameFilters["sort"],
      page: 1,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Search games..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <div className="flex gap-2">
          <Select onValueChange={setGenre} defaultValue="all">
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={setSort} defaultValue="title">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* System filter chips */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!filters.system ? "default" : "outline"}
          size="sm"
          onClick={() => setSystem(undefined)}
        >
          All Systems
        </Button>
        {SYSTEMS.map((sys) => (
          <Button
            key={sys}
            variant={filters.system === sys ? "default" : "outline"}
            size="sm"
            onClick={() => setSystem(filters.system === sys ? undefined : sys)}
          >
            {sys.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Game grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data?.games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="group block space-y-2"
                prefetch={false}
                onMouseEnter={() => {
                  // Prefetch game detail page resources on hover
                  const link = document.createElement("link");
                  link.rel = "prefetch";
                  link.href = `/games/${game.slug}`;
                  link.as = "document";
                  if (!document.head.querySelector(`link[href="/games/${game.slug}"]`)) {
                    document.head.appendChild(link);
                  }
                }}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {game.coverArtPath ? (
                    <Image
                      src={game.coverArtPath}
                      alt={game.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No Art
                    </div>
                  )}
                  {game.isPremium && (
                    <Badge className="absolute top-1 right-1 text-xs" variant="secondary">
                      Premium
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm line-clamp-2 group-hover:underline">
                    {game.title}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {game.system.toUpperCase()}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>

          {data?.games.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No games found. Try adjusting your filters.
            </p>
          )}

          {/* Pagination */}
          {data && data.games.length === data.pageSize && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {filters.page ?? 1}
              </span>
              <Button
                variant="outline"
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
