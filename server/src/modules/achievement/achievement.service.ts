import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAchievement } from '../../entities/user-achievement.entity';
import { User } from '../../entities/user.entity';
import { AchievementDef, AchievementRuleType } from '../../entities/achievement-def.entity';

const SEED_DEFS: Array<{
  key: string;
  name: string;
  desc: string;
  icon: string;
  points: number;
  ruleType: AchievementRuleType;
  ruleValue: number;
  sortOrder: number;
}> = [
  { key: 'checkin_1', name: '初次打卡', desc: '累计完成 1 次场地签到', icon: '📍', points: 10, ruleType: 'checkin_count', ruleValue: 1, sortOrder: 10 },
  { key: 'checkin_5', name: '五次打卡', desc: '累计完成 5 次场地签到', icon: '🏓', points: 25, ruleType: 'checkin_count', ruleValue: 5, sortOrder: 20 },
  { key: 'checkin_10', name: '十次打卡', desc: '累计完成 10 次场地签到', icon: '⭐', points: 50, ruleType: 'checkin_count', ruleValue: 10, sortOrder: 30 },
  { key: 'checkin_30', name: '三十次打卡', desc: '累计完成 30 次场地签到', icon: '🏆', points: 100, ruleType: 'checkin_count', ruleValue: 30, sortOrder: 40 },
  { key: 'first_checkin', name: '初次打卡(旧)', desc: '兼容旧版首次签到', icon: '📍', points: 10, ruleType: 'legacy', ruleValue: 0, sortOrder: 5 },
  { key: 'visit_100_days', name: '百日球王', desc: '累计打球达到100小时', icon: '🏆', points: 100, ruleType: 'manual', ruleValue: 0, sortOrder: 50 },
  { key: 'early_riser', name: '早起达人', desc: '在早上8点前签到10次', icon: '☀️', points: 50, ruleType: 'manual', ruleValue: 0, sortOrder: 60 },
  { key: 'swift_wins', name: '迅捷如风', desc: '连续赢得5场比赛', icon: '⚡', points: 80, ruleType: 'manual', ruleValue: 0, sortOrder: 70 },
  { key: 'social_butterfly', name: '广交球友', desc: '与20名不同的球友切磋', icon: '🤝', points: 60, ruleType: 'manual', ruleValue: 0, sortOrder: 80 },
  { key: 'reviewer', name: '点评达人', desc: '发表10条场地评价', icon: '📝', points: 30, ruleType: 'manual', ruleValue: 0, sortOrder: 90 },
];

@Injectable()
export class AchievementService implements OnModuleInit {
  constructor(
    @InjectRepository(UserAchievement)
    private achievementRepo: Repository<UserAchievement>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AchievementDef)
    private defRepo: Repository<AchievementDef>,
  ) {}

  async onModuleInit() {
    await this.ensureSeedDefs();
  }

  async ensureSeedDefs() {
    for (const seed of SEED_DEFS) {
      const existing = await this.defRepo.findOne({ where: { key: seed.key } });
      if (existing) continue;
      // Hide legacy duplicate by default when checkin_1 exists in seed set
      const enabled = seed.key !== 'first_checkin';
      await this.defRepo.save(this.defRepo.create({ ...seed, enabled, iconUrl: null }));
    }
  }

  async checkAndAward(userId: number, key: string): Promise<UserAchievement | null> {
    const def = await this.defRepo.findOne({ where: { key } });
    if (!def || !def.enabled) return null;

    const existing = await this.achievementRepo.findOne({
      where: { userId, achievementKey: key },
    });
    if (existing) return null;

    const record = this.achievementRepo.create({ userId, achievementKey: key });
    await this.achievementRepo.save(record);
    await this.userRepo.increment({ id: userId }, 'points', def.points);
    return record;
  }

  /** Award all enabled checkin_count medals whose threshold <= count (idempotent). */
  async checkAndAwardByRules(
    userId: number,
    ctx: { checkinCount: number },
  ): Promise<UserAchievement[]> {
    const defs = await this.defRepo.find({
      where: { enabled: true, ruleType: 'checkin_count' as AchievementRuleType },
      order: { ruleValue: 'ASC' },
    });
    const awarded: UserAchievement[] = [];
    for (const def of defs) {
      if (ctx.checkinCount >= def.ruleValue) {
        const row = await this.checkAndAward(userId, def.key);
        if (row) awarded.push(row);
      }
    }
    // Keep legacy key in sync for old clients
    if (ctx.checkinCount >= 1) {
      const legacy = await this.checkAndAward(userId, 'first_checkin');
      if (legacy) awarded.push(legacy);
    }
    return awarded;
  }

  async getUserAchievements(userId: number) {
    const unlocked = await this.achievementRepo.find({ where: { userId } });
    const defs = await this.defRepo.find({
      where: { enabled: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return defs.map((def) => {
      const record = unlocked.find((a) => a.achievementKey === def.key);
      return {
        id: def.key,
        key: def.key,
        name: def.name,
        desc: def.desc,
        icon: def.icon,
        iconUrl: def.iconUrl || null,
        points: def.points,
        ruleType: def.ruleType,
        ruleValue: def.ruleValue,
        unlocked: !!record,
        unlockedAt: record?.unlockedAt || null,
      };
    });
  }

  // ── Admin CRUD ──

  async listDefs(includeDisabled = true) {
    const qb = this.defRepo.createQueryBuilder('d').orderBy('d.sortOrder', 'ASC').addOrderBy('d.id', 'ASC');
    if (!includeDisabled) qb.where('d.enabled = :en', { en: true });
    return qb.getMany();
  }

  async createDef(data: Partial<AchievementDef>) {
    if (!data.key || !data.name) throw new BadRequestException('key 与 name 必填');
    const exists = await this.defRepo.findOne({ where: { key: data.key } });
    if (exists) throw new BadRequestException('勋章 key 已存在');
    return this.defRepo.save(this.defRepo.create({
      key: data.key,
      name: data.name,
      desc: data.desc || '',
      icon: data.icon || '🏅',
      iconUrl: data.iconUrl || null,
      points: data.points ?? 10,
      enabled: data.enabled !== false,
      ruleType: data.ruleType || 'manual',
      ruleValue: data.ruleValue ?? 0,
      sortOrder: data.sortOrder ?? 100,
    }));
  }

  async updateDef(id: number, data: Partial<AchievementDef>) {
    const def = await this.defRepo.findOne({ where: { id } });
    if (!def) throw new NotFoundException('勋章不存在');
    const { key: _k, id: _id, createdAt: _c, ...rest } = data as any;
    Object.assign(def, rest);
    return this.defRepo.save(def);
  }

  async setEnabled(id: number, enabled: boolean) {
    return this.updateDef(id, { enabled });
  }
}
