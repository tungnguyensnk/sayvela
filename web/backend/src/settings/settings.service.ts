import { Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';

// orchestrates reading and writing user settings
@Injectable()
export class SettingsService {
  constructor(private repo: SettingsRepository) {}

  // returns current settings for user, creating defaults if none exist
  async get(userId: string) {
    const row = await this.repo.findByUser(userId);
    if (!row) return { settingsJson: {}, version: 0, updatedAt: null };
    return {
      settingsJson: row.settingsJson,
      version: row.version,
      updatedAt: row.updatedAt,
    };
  }

  // replaces user settings with provided json object
  async update(userId: string, settingsJson: Record<string, unknown>) {
    const row = await this.repo.upsert(userId, settingsJson);
    return {
      settingsJson: row.settingsJson,
      version: row.version,
      updatedAt: row.updatedAt,
    };
  }
}
