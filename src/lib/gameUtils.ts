/**
 * Pure utility functions for game filtering and sorting.
 * These are extracted for testability without requiring a database connection.
 */

export type SortKey = "title" | "releaseYear" | "totalPlays";

/**
 * Filter a list of game-like objects by title (case-insensitive).
 * Validates: Requirements 13.2
 */
export function filterBySearch<T extends { title: string }>(
  games: T[],
  query: string
): T[] {
  const lower = query.toLowerCase();
  return games.filter((g) => g.title.toLowerCase().includes(lower));
}

/**
 * Sort a list of game-like objects by a given key ascending.
 * Validates: Requirements 13.8
 */
export function sortGameList<
  T extends { title: string; releaseYear: number | null; totalPlays: number }
>(games: T[], key: SortKey): T[] {
  return [...games].sort((a, b) => {
    if (key === "title") {
      return a.title.localeCompare(b.title);
    }
    if (key === "releaseYear") {
      return (a.releaseYear ?? 0) - (b.releaseYear ?? 0);
    }
    // totalPlays
    return a.totalPlays - b.totalPlays;
  });
}
