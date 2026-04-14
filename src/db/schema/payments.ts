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

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  plan: varchar("plan", { length: 20 }).notNull().default("pro"),
  status: varchar("status", { length: 20 }).notNull(), // "active"|"past_due"|"canceled"|"trialing"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 })
    .notNull()
    .unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gamePurchases = pgTable(
  "game_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    gameId: uuid("game_id").notNull().references(() => games.id),
    purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", {
      length: 255,
    }).notNull(),
    amountCents: integer("amount_cents").notNull(),
  },
  (t) => ({
    uniquePurchase: unique().on(t.userId, t.gameId),
  })
);
