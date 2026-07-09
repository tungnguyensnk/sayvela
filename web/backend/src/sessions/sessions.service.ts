import { Injectable } from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';

type SegmentInput = {
  id: string;
  speaker?: string;
  text: string;
  startMs: number;
  endMs: number;
};

@Injectable()
export class SessionsService {
  constructor(private repo: SessionsRepository) {}

  async createSession(params: { userId: string; title?: string }) {
    const id = await this.repo.create(params);
    return { id };
  }

  async listSessions(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.repo.findByUser(userId, limit, offset),
      this.repo.countByUser(userId),
    ]);
    return { items, total, page, limit };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.repo.findById(sessionId);
    if (!session || session.userId !== userId) return null;
    const segments = await this.repo.findSegmentsBySession(sessionId);
    return { ...session, segments };
  }

  async updateSession(
    userId: string,
    sessionId: string,
    patch: {
      title?: string;
      status?: string;
      durationSeconds?: number;
      summary?: string;
    },
  ) {
    const session = await this.repo.findById(sessionId);
    if (!session || session.userId !== userId) return false;
    await this.repo.update(sessionId, patch);
    return true;
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.repo.findById(sessionId);
    if (!session || session.userId !== userId) return false;
    await this.repo.remove(sessionId);
    return true;
  }

  async bulkInsertSegments(
    userId: string,
    sessionId: string,
    segments: SegmentInput[],
  ) {
    const session = await this.repo.findById(sessionId);
    if (!session || session.userId !== userId) return false;
    await this.repo.insertSegments(sessionId, segments);
    return true;
  }
}
