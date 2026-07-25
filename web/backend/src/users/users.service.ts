import { Injectable } from '@nestjs/common';
import { db } from '../db';
import { users } from '../schema/users';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcrypt';
import { createId } from '../common/id';

@Injectable()
export class UsersService {
  async findById(id: string) {
    const res = await db.select().from(users).where(eq(users.id, id));
    return res[0] ?? null;
  }

  async findByEmail(email: string) {
    const res = await db.select().from(users).where(eq(users.email, email));
    return res[0] ?? null;
  }

  async create(email: string, password: string) {
    const exists = await this.findByEmail(email);
    if (exists) return null;
    const id = createId();
    const passwordHash = await hash(password, 10);
    await db.insert(users).values({ id, email, passwordHash });
    return { id, email };
  }

  async verify(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await compare(password, user.passwordHash);
    if (!ok) return null;
    return { id: user.id, email: user.email };
  }
}
