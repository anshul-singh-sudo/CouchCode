import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  system: varchar("system", { length: 20 }).notNull(), // "nes"|"snes"|"gba"|"n64"|"psp"|"ps2"
  genre: varchar("genre", { length: 50 }).notNull(),
  tags: text("tags").array(),
  romPath: varchar("rom_path", { length: 500 }).notNull(),
  coverArtPath: varchar("cover_art_path", { length: 500 }),
  description: text("description"),
  releaseYear: integer("release_year"),
  playerCount: integer("player_count").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  isPremium: boolean("is_premium").notNull().default(false),
  price: integer("price"), // cents, null = free
  totalPlays: integer("total_plays").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
