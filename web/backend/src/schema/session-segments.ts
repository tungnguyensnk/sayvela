import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sessions } from './sessions';

export const sessionSegments = pgTable(
  'session_segments',
  {
    id: uuid('id').primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    speaker: varchar('speaker', { length: 64 }),
    text: text('text').notNull(),
    startMs: integer('start_ms').notNull().default(0),
    endMs: integer('end_ms').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('idx_segments_session').on(t.sessionId, t.startMs)],
);
