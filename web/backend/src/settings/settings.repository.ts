import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createId } from '../common/id';
import { db } from '../db';
import { userSettings } from '../schema';

// manages persistence of per-user settings in postgres via jsonb column
@Injectable()
export class SettingsRepository {
  // returns settings row for user, or null if not found
  async findByUser(userId: string) {
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return rows[0] ?? null;
  }

  // upserts settings for user; increments version on each update
  async upsert(userId: string, settingsJson: Record<string, unknown>) {
    const existing = await this.findByUser(userId);
    if (!existing) {
      await db.insert(userSettings).values({
        id: createId(),
        userId,
        settingsJson,
        version: 1,
      });
    } else {
      await db
        .update(userSettings)
        .set({
          settingsJson,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));
    }
    return this.findByUser(userId);
  }
}
