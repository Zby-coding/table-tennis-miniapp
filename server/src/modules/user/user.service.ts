import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
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

    const levelLabel = this.getLevelLabel(user.level);

    return {
      id: user.id,
      username: user.nickname,
      level: levelLabel,
      levelBadge: this.getLevelBadge(user.level),
      avatarUrl: user.avatarUrl,
      hoursPlayed: user.totalHours,
      winRate,
      points: user.points,
      achievements: user.achievements.map((a) => ({
        id: `ach_${a.id}`,
        name: this.getAchievementName(a.achievementKey),
        desc: this.getAchievementDesc(a.achievementKey),
        icon: this.getAchievementIcon(a.achievementKey),
        color: 'bg-gradient-to-br from-primary to-primary-light text-white',
        unlocked: true,
      })),
    };
  }

  async updateProfile(id: number, data: { nickname?: string; avatarUrl?: string; style?: string; city?: string }) {
    await this.userRepo.update(id, data);
    return this.getProfile(id);
  }

  private getLevelLabel(level: number): string {
    const labels: Record<number, string> = { 1: 'L1 萌新', 2: 'L2 进阶', 3: 'L3 高级', 4: 'Pro 大神' };
    return labels[level] || 'L1 萌新';
  }

  private getLevelBadge(level: number): string {
    const badges: Record<number, string> = { 1: '乒乓球新手', 2: '乒乓球达人', 3: '乒乓球高手', 4: '乒乓球大师' };
    return badges[level] || '乒乓球新手';
  }

  private getAchievementName(key: string): string {
    const names: Record<string, string> = {
      visit_100_days: '百日球王', early_riser: '早起达人',
      swift_wins: '迅捷如风', social_butterfly: '广交球友',
      first_checkin: '初次打卡', reviewer: '点评达人',
    };
    return names[key] || key;
  }

  private getAchievementDesc(key: string): string {
    const descs: Record<string, string> = {
      visit_100_days: '累计打球达到100小时', early_riser: '在早上8点前签到10次',
      swift_wins: '连续赢得5场比赛', social_butterfly: '与20名不同的球友切磋',
      first_checkin: '完成第一次场地签到', reviewer: '发表10条场地评价',
    };
    return descs[key] || key;
  }

  private getAchievementIcon(key: string): string {
    const icons: Record<string, string> = {
      visit_100_days: '🏆', early_riser: '☀️',
      swift_wins: '⚡', social_butterfly: '🤝',
      first_checkin: '📍', reviewer: '📝',
    };
    return icons[key] || '🏅';
  }
}
