import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// stores per-user configuration; one row per user, jsonb allows flexible settings shape
export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    settingsJson: jsonb('settings_json').notNull().default({}),
    version: integer('version').notNull().default(1),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('idx_user_settings_user').on(t.userId)],
);
