"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type FavoriteGame = {
  gameId: string;
  createdAt: string;
  title: string;
  slug: string;
  system: string;
  genre: string;
  coverArtPath: string | null;
  isPremium: boolean;
  isActive: boolean;
};

async function fetchFavorites(): Promise<{ favorites: FavoriteGame[] }> {
  const res = await fetch("/api/user/favorites");
  if (!res.ok) throw new Error("Failed to fetch favorites");
  return res.json();
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: fetchFavorites,
    staleTime: 30_000,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gameId: string) => {
      const res = await fetch(`/api/user/favorites/${gameId}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message ?? "Failed to add favorite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gameId: string) => {
      const res = await fetch(`/api/user/favorites/${gameId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove favorite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
