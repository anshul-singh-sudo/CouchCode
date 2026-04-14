"use client";

import { useQuery } from "@tanstack/react-query";

export type GameFilters = {
  system?: string;
  genre?: string;
  search?: string;
  sort?: "title" | "releaseYear" | "totalPlays";
  page?: number;
};

export type Game = {
  id: string;
  title: string;
  slug: string;
  system: string;
  genre: string;
  coverArtPath: string | null;
  description: string | null;
  releaseYear: number | null;
  playerCount: number;
  isActive: boolean;
  isPremium: boolean;
  price: number | null;
  totalPlays: number;
  createdAt: string;
};

export type GamesResponse = {
  games: Game[];
  page: number;
  pageSize: number;
};

async function fetchGames(filters: GameFilters): Promise<GamesResponse> {
  const params = new URLSearchParams();
  if (filters.system) params.set("system", filters.system);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));

  const res = await fetch(`/api/games?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json();
}

export function useGames(filters: GameFilters = {}) {
  return useQuery({
    queryKey: ["games", filters],
    queryFn: () => fetchGames(filters),
    staleTime: 30_000,
  });
}
