import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { games } from "./games";
import { gameSessions } from "./sessions";

export const playHistory = pgTable("play_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id), // null for guests
  gameId: uuid("game_id").notNull().references(() => games.id),
  sessionId: uuid("session_id").references(() => gameSessions.id),
  playedAt: timestamp("played_at").notNull().defaultNow(),
  durationSeconds: integer("duration_seconds"),
});

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull().references(() => users.id),
    gameId: uuid("game_id").notNull().references(() => games.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.gameId] }),
  })
);

export const adImpressions = pgTable("ad_impressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  gameId: uuid("game_id").references(() => games.id),
  adUnit: varchar("ad_unit", { length: 100 }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});
