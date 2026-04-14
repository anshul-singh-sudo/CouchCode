import { eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema/users";

export async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user ?? null;
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

export type UpdateUserInput = Partial<{
  username: string;
  avatarUrl: string;
  role: string;
  subscriptionTier: string;
  isBanned: boolean;
  passwordHash: string;
}>;

export async function updateUser(id: string, data: UpdateUserInput) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated ?? null;
}
