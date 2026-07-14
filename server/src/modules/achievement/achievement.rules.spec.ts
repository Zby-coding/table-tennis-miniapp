import { AchievementRules } from './achievement.rules';

describe('AchievementRules.medalsForCheckinCount', () => {
  const defs = [
    { key: 'checkin_1', ruleType: 'checkin_count', ruleValue: 1, enabled: true },
    { key: 'checkin_5', ruleType: 'checkin_count', ruleValue: 5, enabled: true },
    { key: 'checkin_10', ruleType: 'checkin_count', ruleValue: 10, enabled: false },
    { key: 'manual', ruleType: 'manual', ruleValue: 0, enabled: true },
  ];

  it('awards all enabled thresholds met by count', () => {
    expect(AchievementRules.medalsForCheckinCount(defs, 5)).toEqual(['checkin_1', 'checkin_5']);
  });

  it('does not require consecutive days', () => {
    expect(AchievementRules.medalsForCheckinCount(defs, 1)).toEqual(['checkin_1']);
  });

  it('skips disabled defs', () => {
    expect(AchievementRules.medalsForCheckinCount(defs, 20)).toEqual(['checkin_1', 'checkin_5']);
  });
});
