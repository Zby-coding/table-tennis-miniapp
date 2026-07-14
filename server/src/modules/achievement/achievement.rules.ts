import { Injectable } from '@nestjs/common';
import { AchievementService } from './achievement.service';

/**
 * Pure helpers for unit tests without DB.
 */
@Injectable()
export class AchievementRules {
  static medalsForCheckinCount(
    defs: Array<{ key: string; ruleType: string; ruleValue: number; enabled: boolean }>,
    checkinCount: number,
  ): string[] {
    return defs
      .filter((d) => d.enabled && d.ruleType === 'checkin_count' && checkinCount >= d.ruleValue)
      .map((d) => d.key);
  }
}

// Re-export service for existing imports
export { AchievementService };
