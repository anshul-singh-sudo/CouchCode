import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { games } from "./games";

export const saveStates = pgTable(
  "save_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    gameId: uuid("game_id").notNull().references(() => games.id),
    slotNumber: integer("slot_number").notNull(),
    stateDataPath: varchar("state_data_path", { length: 500 }).notNull(),
    thumbnailPath: varchar("thumbnail_path", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueSlot: unique().on(t.userId, t.gameId, t.slotNumber),
  })
);
