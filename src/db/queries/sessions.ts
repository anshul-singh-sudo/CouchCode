import { eq, count } from "drizzle-orm";
import { db } from "../index";
import { gameSessions } from "../schema/sessions";
import { sessionDevices } from "../schema/sessions";

export type CreateSessionInput = {
  code: string;
  hostUserId?: string;
  gameId: string;
  mode: number;
};

export async function createSession(input: CreateSessionInput) {
  const [session] = await db
    .insert(gameSessions)
    .values({
      code: input.code,
      hostUserId: input.hostUserId,
      gameId: input.gameId,
      mode: input.mode,
    })
    .returning();
  return session;
}

export async function getSession(code: string) {
  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.code, code))
    .limit(1);
  return session ?? null;
}

export type AddDeviceInput = {
  sessionId: string;
  deviceToken: string;
  role: "host" | "display" | "controller";
  playerSlot?: number;
};

export async function addDevice(input: AddDeviceInput) {
  const [device] = await db
    .insert(sessionDevices)
    .values({
      sessionId: input.sessionId,
      deviceToken: input.deviceToken,
      role: input.role,
      playerSlot: input.playerSlot,
    })
    .returning();
  return device;
}

export async function getDeviceCount(sessionId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(sessionDevices)
    .where(eq(sessionDevices.sessionId, sessionId));
  return result?.count ?? 0;
}
