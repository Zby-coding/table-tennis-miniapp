import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserLevel } from '../../entities/user.entity';
import { CheckIn } from '../../entities/checkin.entity';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(CheckIn)
    private checkinRepo: Repository<CheckIn>,
    @InjectRepository(Favorite)
    private favoriteRepo: Repository<Favorite>,
  ) {}

  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async getProfile(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { achievements: true },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const winRate = user.totalMatches > 0
      ? Math.round((user.wins / user.totalMatches) * 100 * 10) / 10
      : 0;

    const [checkinCount, favoriteCount] = await Promise.all([
      this.checkinRepo.count({ where: { userId: id } }),
      this.favoriteRepo.count({ where: { userId: id } }),
    ]);

    return {
      id: user.id,
      username: user.nickname,
      nickname: user.nickname,
      level: this.getLevelLabel(user.level),
      levelValue: user.level,
      levelBadge: this.getLevelBadge(user.level),
      avatarUrl: user.avatarUrl,
      city: user.city,
      style: user.style,
      role: user.role,
      status: user.status,
      lastActiveAt: user.lastActiveAt,
      hoursPlayed: user.totalHours,
      winRate,
      totalMatches: user.totalMatches,
      wins: user.wins,
      points: user.points,
      checkinStreak: user.checkinStreak,
      checkinCount,
      favoriteCount,
      preferences: {
        remindMatch: user.remindMatch ?? true,
        remindSignIn: user.remindSignIn ?? true,
        showActivity: user.showActivity ?? true,
      },
      achievements: (user.achievements || []).map((a) => ({
        id: `ach_${a.id}`,
        name: this.getAchievementName(a.achievementKey),
        desc: this.getAchievementDesc(a.achievementKey),
        icon: this.getAchievementIcon(a.achievementKey),
        color: 'bg-gradient-to-br from-primary to-primary-light text-white',
        unlocked: true,
      })),
    };
  }

  async updateProfile(
    id: number,
    data: { nickname?: string; avatarUrl?: string; style?: string; city?: string },
  ) {
    const update: Record<string, unknown> = {};
    if (data.nickname !== undefined) {
      const nickname = data.nickname.trim();
      if (!nickname) throw new BadRequestException('昵称不能为空');
      update.nickname = nickname;
    }
    if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl.trim();
    if (data.style !== undefined) update.style = data.style;
    if (data.city !== undefined) update.city = data.city.trim();
    if (Object.keys(update).length > 0) await this.userRepo.update(id, update);
    return this.getProfile(id);
  }

  async updatePreferences(id: number, data: { remindMatch?: boolean; remindSignIn?: boolean; showActivity?: boolean }) {
    const update: Record<string, unknown> = {};
    for (const key of ['remindMatch', 'remindSignIn', 'showActivity'] as const) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    if (Object.keys(update).length > 0) await this.userRepo.update(id, update);
    const user = await this.findById(id);
    return {
      remindMatch: user.remindMatch ?? true,
      remindSignIn: user.remindSignIn ?? true,
      showActivity: user.showActivity ?? true,
    };
  }

  async touchLastActive(id: number) {
    await this.userRepo.update(id, { lastActiveAt: new Date() });
  }

  async getUserSummary(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      city: user.city,
      style: user.style,
      level: user.level,
      role: user.role,
      status: user.status,
      totalHours: user.totalHours,
      totalMatches: user.totalMatches,
      wins: user.wins,
      winRate: user.totalMatches > 0 ? Math.round((user.wins / user.totalMatches) * 1000) / 10 : 0,
      points: user.points,
      checkinStreak: user.checkinStreak,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      adminNote: user.adminNote,
    };
  }

  private getLevelLabel(level: number): string {
    const labels: Record<number, string> = { 1: 'L1 萌新', 2: 'L2 进阶', 3: 'L3 高级', 4: 'Pro 大神' };
    return labels[level] || labels[UserLevel.L1];
  }

  private getLevelBadge(level: number): string {
    const badges: Record<number, string> = { 1: '乒乓球新手', 2: '乒乓球达人', 3: '乒乓球高手', 4: '乒乓球大师' };
    return badges[level] || badges[UserLevel.L1];
  }

  private getAchievementName(key: string): string {
    const names: Record<string, string> = {
      visit_100_days: '百日球王', early_riser: '早起达人', swift_wins: '迅捷如风', social_butterfly: '广交球友', first_checkin: '初次打卡', reviewer: '点评达人',
    };
    return names[key] || key;
  }

  private getAchievementDesc(key: string): string {
    const descs: Record<string, string> = {
      visit_100_days: '累计打球达到100小时', early_riser: '在早上8点前签到10次', swift_wins: '连续赢得5场比赛', social_butterfly: '与20名不同的球友切磋', first_checkin: '完成第一次场地签到', reviewer: '发表10条场地评价',
    };
    return descs[key] || key;
  }

  private getAchievementIcon(key: string): string {
    const icons: Record<string, string> = {
      visit_100_days: '🏆', early_riser: '☀️', swift_wins: '⚡', social_butterfly: '🤝', first_checkin: '📍', reviewer: '📝',
    };
    return icons[key] || '🏅';
  }
}
