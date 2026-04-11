import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    language: varchar('language', { length: 16 }),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    summary: text('summary'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_sessions_user_created').on(t.userId, t.createdAt),
    index('idx_sessions_user_status').on(t.userId, t.status),
  ],
);
