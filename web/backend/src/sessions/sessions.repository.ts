import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db';
import { sessionSegments, sessions } from '../schema';

type CreateInput = {
  userId: string;
  title?: string;
};

type UpdateInput = Partial<{
  title: string;
  status: string;
  durationSeconds: number;
  summary: string;
}>;

type SegmentInput = {
  id: string;
  speaker?: string;
  source?: string;
  language?: string;
  translationStatus?: string;
  originId?: string;
  text: string;
  startMs: number;
  endMs: number;
};

@Injectable()
export class SessionsRepository {
  async create(input: CreateInput) {
    const id = crypto.randomUUID();
    await db.insert(sessions).values({
      id,
      userId: input.userId,
      title: input.title ?? null,
    });
    return id;
  }

  async findByUser(userId: string, limit = 20, offset = 0) {
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string) {
    const res = await db.select().from(sessions).where(eq(sessions.id, id));
    return res[0] ?? null;
  }

  async update(id: string, patch: UpdateInput) {
    await db
      .update(sessions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async remove(id: string) {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async insertSegments(sessionId: string, segments: SegmentInput[]) {
    if (segments.length === 0) return;
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    await db.insert(sessionSegments).values(
      segments.map((s) => ({
        id: UUID_RE.test(s.id) ? s.id : crypto.randomUUID(),
        sessionId,
        speaker: s.speaker ?? null,
        source: s.source ?? null,
        language: s.language ?? null,
        translationStatus: s.translationStatus ?? null,
        originId: s.originId ?? null,
        text: s.text,
        startMs: s.startMs,
        endMs: s.endMs,
      })),
    );
  }

  async findSegmentsBySession(sessionId: string) {
    return db
      .select()
      .from(sessionSegments)
      .where(eq(sessionSegments.sessionId, sessionId))
      .orderBy(sessionSegments.startMs);
  }

  async countByUser(userId: string) {
    const res = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId)));
    return res.length;
  }
}
