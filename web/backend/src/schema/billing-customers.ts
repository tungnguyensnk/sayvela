import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const billingCustomers = pgTable('billing_customers', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 })
    .notNull()
    .unique(),
  createdAt: timestamp('created_at').defaultNow(),
});
