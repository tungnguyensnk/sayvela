import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const stripeEvents = pgTable('stripe_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  type: varchar('type', { length: 128 }).notNull(),
  stripeCreatedAt: timestamp('stripe_created_at'),
  processedAt: timestamp('processed_at').defaultNow(),
});
