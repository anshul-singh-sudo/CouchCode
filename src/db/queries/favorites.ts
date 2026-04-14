import { eq, and, count } from "drizzle-orm";
import { db } from "../index";
import { favorites } from "../schema/activity";

export async function getFavorites(userId: string) {
  return db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId));
}

export async function countFavorites(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  return result?.count ?? 0;
}

export async function addFavorite(userId: string, gameId: string) {
  const [favorite] = await db
    .insert(favorites)
    .values({ userId, gameId })
    .returning();
  return favorite;
}

export async function removeFavorite(userId: string, gameId: string) {
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.gameId, gameId)));
}
