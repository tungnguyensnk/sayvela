import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';
import { existsSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString:
    connectionString ?? 'postgres://postgres:postgres@localhost:5432/sayvela',
});
export const db = drizzle(pool, { schema });

export async function runMigrations() {
  const migrationsFolder = join(process.cwd(), 'drizzle');
  const journalPath = join(migrationsFolder, 'meta', '_journal.json');
  if (!existsSync(journalPath)) return;
  await migrate(db, { migrationsFolder });
}
