"use client";

import { useQuery } from "@tanstack/react-query";

export type SaveState = {
  id: string;
  userId: string;
  gameId: string;
  slotNumber: number;
  stateDataPath: string;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
};

async function fetchSaveStates(
  gameId: string
): Promise<{ saveStates: SaveState[] }> {
  const res = await fetch(`/api/save-states/${gameId}`);
  if (!res.ok) throw new Error("Failed to fetch save states");
  return res.json();
}

export function useSaveStates(gameId: string | null) {
  return useQuery({
    queryKey: ["save-states", gameId],
    queryFn: () => fetchSaveStates(gameId!),
    enabled: !!gameId,
    staleTime: 30_000,
  });
}
