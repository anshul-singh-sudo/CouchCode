import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { games } from "./games";

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  hostUserId: uuid("host_user_id").references(() => users.id),
  gameId: uuid("game_id").notNull().references(() => games.id),
  mode: integer("mode").notNull(), // 1|2|3|4
  status: varchar("status", { length: 20 }).notNull().default("active"), // "active"|"ended"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const sessionDevices = pgTable("session_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => gameSessions.id),
  deviceToken: varchar("device_token", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // "host"|"display"|"controller"
  playerSlot: integer("player_slot"), // 1–4, null for display
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
});
