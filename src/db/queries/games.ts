import { eq, ilike, and, asc, desc, or } from "drizzle-orm";
import { db } from "../index";
import { games } from "../schema/games";
import { type SortKey } from "@/lib/gameUtils";

export type { SortKey };
export { filterBySearch, sortGameList } from "@/lib/gameUtils";

export type GameFilters = {
  system?: string;
  genre?: string;
  isActive?: boolean;
  isPremium?: boolean;
};

export async function getGames(filters: GameFilters = {}) {
  const conditions = [];

  if (filters.system) conditions.push(eq(games.system, filters.system));
  if (filters.genre) conditions.push(eq(games.genre, filters.genre));
  if (filters.isActive !== undefined)
    conditions.push(eq(games.isActive, filters.isActive));
  if (filters.isPremium !== undefined)
    conditions.push(eq(games.isPremium, filters.isPremium));

  return db
    .select()
    .from(games)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}

export async function getGameBySlug(slug: string) {
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);
  return game ?? null;
}

export async function searchGames(query: string) {
  return db
    .select()
    .from(games)
    .where(
      or(
        ilike(games.title, `%${query}%`),
        ilike(games.genre, `%${query}%`)
      )
    );
}

export async function sortGames(key: SortKey) {
  const orderCol =
    key === "title"
      ? asc(games.title)
      : key === "releaseYear"
      ? desc(games.releaseYear)
      : desc(games.totalPlays);

  return db.select().from(games).orderBy(orderCol);
}
