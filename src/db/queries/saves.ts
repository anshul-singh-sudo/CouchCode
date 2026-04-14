import { eq, and, count } from "drizzle-orm";
import { db } from "../index";
import { saveStates } from "../schema/saves";

export async function getSaveStates(userId: string, gameId: string) {
  return db
    .select()
    .from(saveStates)
    .where(and(eq(saveStates.userId, userId), eq(saveStates.gameId, gameId)));
}

export async function countSaveStates(
  userId: string,
  gameId: string
): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(saveStates)
    .where(and(eq(saveStates.userId, userId), eq(saveStates.gameId, gameId)));
  return result?.count ?? 0;
}
