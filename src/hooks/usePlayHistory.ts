"use client";

import { useQuery } from "@tanstack/react-query";

export type PlayHistoryEntry = {
  id: string;
  gameId: string;
  gameTitle: string;
  gameSlug: string;
  gameCoverArtPath: string | null;
  gameSystem: string;
  playedAt: string;
  durationSeconds: number | null;
};

async function fetchPlayHistory(): Promise<{ history: PlayHistoryEntry[] }> {
  const res = await fetch("/api/user/play-history");
  if (!res.ok) throw new Error("Failed to fetch play history");
  return res.json();
}

export function usePlayHistory() {
  return useQuery({
    queryKey: ["play-history"],
    queryFn: fetchPlayHistory,
    staleTime: 30_000,
  });
}
