import { hash } from 'bcrypt';
import crypto from 'crypto';
import { db, pool } from './db';
import { users } from './schema/users';
import { eq } from 'drizzle-orm';

async function seed() {
  const email = process.env.SEED_EMAIL ?? 'admin@sayvela.local';
  const password = process.env.SEED_PASSWORD ?? 'Admin@1234!';

  const exists = await db.select().from(users).where(eq(users.email, email));
  if (exists[0]) return;

  const id = crypto.randomUUID();
  const passwordHash = await hash(password, 10);
  await db.insert(users).values({ id, email, passwordHash });
}

void seed()
  .then(() => pool.end())
  .catch(async () => {
    await pool.end();
    process.exit(1);
  });
