import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { createId } from '../common/id';
import { db } from '../db';
import { contexts } from '../schema';

type ContextJson = Record<string, unknown>;

// handles all db operations for the contexts table
@Injectable()
export class ContextsRepository {
  async findAllByUser(userId: string) {
    return db
      .select()
      .from(contexts)
      .where(eq(contexts.userId, userId))
      .orderBy(desc(contexts.createdAt));
  }

  async findById(id: string) {
    const rows = await db.select().from(contexts).where(eq(contexts.id, id));
    return rows[0] ?? null;
  }

  async findByIdAndUser(id: string, userId: string) {
    const rows = await db
      .select()
      .from(contexts)
      .where(and(eq(contexts.id, id), eq(contexts.userId, userId)));
    return rows[0] ?? null;
  }

  async create(
    userId: string,
    name: string,
    description: string | undefined,
    contextJson: ContextJson,
  ) {
    const id = createId();
    await db.insert(contexts).values({
      id,
      userId,
      name,
      description: description ?? null,
      contextJson,
    });
    return this.findById(id);
  }

  async update(
    id: string,
    patch: { name?: string; description?: string; contextJson?: ContextJson },
  ) {
    await db
      .update(contexts)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(contexts.id, id));
  }

  async remove(id: string) {
    await db.delete(contexts).where(eq(contexts.id, id));
  }
}
