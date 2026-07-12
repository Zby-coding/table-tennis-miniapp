import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAchievement } from '../../entities/user-achievement.entity';
import { User } from '../../entities/user.entity';

// Achievement definitions
const ACHIEVEMENTS = {
  first_checkin: { name: '初次打卡', desc: '完成第一次场地签到', icon: '📍', points: 10 },
  visit_100_days: { name: '百日球王', desc: '累计打球达到100小时', icon: '🏆', points: 100 },
  early_riser: { name: '早起达人', desc: '在早上8点前签到10次', icon: '☀️', points: 50 },
  swift_wins: { name: '迅捷如风', desc: '连续赢得5场比赛', icon: '⚡', points: 80 },
  social_butterfly: { name: '广交球友', desc: '与20名不同的球友切磋', icon: '🤝', points: 60 },
  reviewer: { name: '点评达人', desc: '发表10条场地评价', icon: '📝', points: 30 },
  custom_badge: { name: '自定义勋章', desc: '上传第一个自定义图标', icon: '✅', points: 15 },
} as const;

export type AchievementKey = keyof typeof ACHIEVEMENTS;

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(UserAchievement)
    private achievementRepo: Repository<UserAchievement>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Check if user meets conditions and award achievement.
   * Idempotent — won't duplicate.
   */
  async checkAndAward(userId: number, key: AchievementKey): Promise<UserAchievement | null> {
    const existing = await this.achievementRepo.findOne({
      where: { userId, achievementKey: key },
    });

    if (existing) return null; // Already awarded

    const ach = ACHIEVEMENTS[key];
    if (!ach) return null;

    const record = this.achievementRepo.create({
      userId,
      achievementKey: key,
    });
    await this.achievementRepo.save(record);

    // Award points
    await this.userRepo.increment({ id: userId }, 'points', ach.points);

    return record;
  }

  async getUserAchievements(userId: number) {
    const unlocked = await this.achievementRepo.find({
      where: { userId },
    });

    // Return all achievements with unlock status
    return Object.entries(ACHIEVEMENTS).map(([key, def]) => {
      const record = unlocked.find((a) => a.achievementKey === key);
      return {
        id: key,
        name: def.name,
        desc: def.desc,
        icon: def.icon,
        points: def.points,
        unlocked: !!record,
        unlockedAt: record?.unlockedAt || null,
      };
    });
  }
}
