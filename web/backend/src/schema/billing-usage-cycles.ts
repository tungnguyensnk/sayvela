import {
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const billingUsageCycles = pgTable(
  'billing_usage_cycles',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plan: varchar('plan', { length: 16 }).notNull(),
    minutesLimit: integer('minutes_limit').notNull(),
    minutesUsed: integer('minutes_used').notNull().default(0),
    cycleStartedAt: timestamp('cycle_started_at').notNull(),
    cycleEndsAt: timestamp('cycle_ends_at').notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_usage_cycles_user_dates').on(
      t.userId,
      t.cycleStartedAt,
      t.cycleEndsAt,
    ),
  ],
);
