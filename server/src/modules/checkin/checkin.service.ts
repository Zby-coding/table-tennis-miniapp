import { Injectable, BadRequestException, ServiceUnavailableException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CheckIn } from '../../entities/checkin.entity';
import { User } from '../../entities/user.entity';
import { Court } from '../../entities/court.entity';
import { AchievementService } from '../achievement/achievement.service';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    @InjectRepository(CheckIn)
    private checkinRepo: Repository<CheckIn>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Court)
    private courtRepo: Repository<Court>,
    @Inject('REDIS_CLIENT') private redis: any,
    private configService: ConfigService,
    private achievementService: AchievementService,
  ) {}

  async checkin(userId: number, courtId: number, userLat: number, userLng: number) {
    if (!this.redis) throw new ServiceUnavailableException('服务暂不可用');
    // 1. Fetch court coordinates and validate GPS
    const court = await this.courtRepo.findOne({ where: { id: courtId } });
    if (!court) throw new BadRequestException('场地不存在');
    if (court.status !== 1) throw new BadRequestException('该场地已关闭');

    const gpsRadius = this.configService.get<number>('app.checkin.gpsRadius') || 200;
    const distance = this.calcDistance(userLat, userLng, Number(court.lat), Number(court.lng));

    if (distance > gpsRadius) {
      throw new BadRequestException(
        `请在场地附近打卡（当前距离 ${Math.round(distance)}m，需要 ${gpsRadius}m 以内）`,
      );
    }

    // 2. Atomic guard: SET NX prevents duplicate checkins
    const timeoutMinutes = this.configService.get<number>('app.checkin.autoTimeoutMinutes') || 180;
    const activeKey = `user:${userId}:checkin`;
    const acquired = await this.redis.set(activeKey, String(courtId), 'EX', timeoutMinutes * 60, 'NX');

    if (!acquired) {
      throw new BadRequestException('您已在其他场地打卡，请先签退');
    }

    try {
      // 3. Create checkin record
      const checkin = this.checkinRepo.create({
        userId, courtId,
        startTime: new Date(),
        checkinLat: userLat, checkinLng: userLng,
        status: 1,
      });
      await this.checkinRepo.save(checkin);

      // 4. Update Redis counters (with TTL matching user checkin TTL)
      const courtCountKey = `court:${courtId}:active_count`;
      const courtUsersKey = `court:${courtId}:active_users`;

      await this.redis
        .pipeline()
        .incr(courtCountKey)
        .expire(courtCountKey, timeoutMinutes * 60 + 600) // 10min extra grace
        .sadd(courtUsersKey, String(userId))
        .expire(courtUsersKey, timeoutMinutes * 60 + 600)
        .set(`user:${userId}:checkin_time`, Date.now().toString())
        .exec();

      // 6. Check achievements by cumulative checkin count
      const checkinCount = await this.checkinRepo.count({ where: { userId } });
      const awarded = await this.achievementService.checkAndAwardByRules(userId, { checkinCount });

      return {
        success: true,
        courtId,
        checkinCount,
        activePlayers: await this.redis.get(courtCountKey),
        newAchievements: awarded.map((a) => a.achievementKey),
      };
    } catch (err) {
      // Best-effort rollback: DB record
      try {
        await this.checkinRepo.delete({ userId, courtId, status: 1 });
      } catch (dbErr) {
        this.logger.error(`Failed to rollback DB checkin for user ${userId}`, dbErr);
      }
      // Best-effort rollback: Redis counters
      try {
        await this.redis.pipeline()
          .decr(`court:${courtId}:active_count`)
          .srem(`court:${courtId}:active_users`, String(userId))
          .del(`user:${userId}:checkin_time`)
          .exec();
      } catch (redisErr) {
        this.logger.error(`Failed to rollback Redis state for user ${userId}`, redisErr);
      }
      // Always delete the guard key (this is the most critical rollback)
      await this.redis.del(activeKey);
      throw err;
    }
  }

  async checkout(userId: number) {
    if (!this.redis) throw new ServiceUnavailableException('服务暂不可用');
    const activeKey = `user:${userId}:checkin`;
    const courtId = await this.redis.get(activeKey);

    if (!courtId) {
      throw new BadRequestException('您当前没有进行中的打卡');
    }

    const courtIdNum = Number(courtId);
    if (isNaN(courtIdNum)) {
      this.logger.error(`Invalid courtId in Redis: ${courtId}`);
      await this.redis.del(activeKey);
      throw new BadRequestException('打卡数据异常，已自动清理');
    }

    // Find and close only the most recent active checkin
    const activeRecord = await this.checkinRepo.findOne({
      where: { userId, status: 1 },
      order: { startTime: 'DESC' },
    });

    if (activeRecord) {
      const checkinTime = await this.redis.get(`user:${userId}:checkin_time`);
      const duration = checkinTime
        ? Math.round((Date.now() - parseInt(checkinTime)) / 60000)
        : 0;

      await this.checkinRepo.update(activeRecord.id, {
        endTime: new Date(),
        duration,
        status: 2,
      });
    }

    // Cleanup Redis
    await this.redis
      .pipeline()
      .decr(`court:${courtIdNum}:active_count`)
      .srem(`court:${courtIdNum}:active_users`, String(userId))
      .del(activeKey)
      .del(`user:${userId}:checkin_time`)
      .exec();

    return {
      success: true,
      duration: activeRecord?.duration ?? 0,
      activePlayers: await this.redis.get(`court:${courtIdNum}:active_count`),
    };
  }

  async getActiveCount(courtId: number, options: { includePlayers?: boolean } = {}) {
    // No Redis fallback: return 0 active
    if (!this.redis) return { count: 0, players: [] };

    const count = await this.redis.get(`court:${courtId}:active_count`);
    if (!options.includePlayers) {
      return { count: parseInt(count || '0', 10), players: [] };
    }

    const userIds = await this.redis.smembers(`court:${courtId}:active_users`);
    const users = userIds.length > 0
      ? await this.userRepo.findBy({ id: In(userIds.map(Number)) } as any)
      : [];

    return {
      count: parseInt(count || '0', 10),
      players: users
        .filter((u) => u.showActivity !== false)
        .map((u) => ({
          id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl,
        })),
    };
  }

  async getUserStatus(userId: number) {
    const checkinCount = await this.checkinRepo.count({ where: { userId } });
    if (!this.redis) return { isCheckedIn: false, checkinCount };

    const activeKey = `user:${userId}:checkin`;
    const courtId = await this.redis.get(activeKey);
    if (!courtId) return { isCheckedIn: false, checkinCount };

    const checkinTime = await this.redis.get(`user:${userId}:checkin_time`);
    const duration = checkinTime ? Math.round((Date.now() - parseInt(checkinTime)) / 60000) : 0;

    return { isCheckedIn: true, courtId: Number(courtId), duration, checkinCount };
  }

  async getHistory(userId: number, page = 1, pageSize = 20) {
    const take = Math.min(Math.max(pageSize, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;
    const [rows, total] = await this.checkinRepo.findAndCount({
      where: { userId },
      relations: { court: true },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return {
      total,
      page,
      pageSize: take,
      checkinCount: total,
      list: rows.map((r) => ({
        id: r.id,
        courtId: r.courtId,
        courtName: r.court?.name || '未知场地',
        courtAddress: r.court?.address || '',
        startTime: r.startTime,
        endTime: r.endTime,
        duration: r.duration,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  async adminList(query: {
    userId?: number;
    courtId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(query.page || 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const qb = this.checkinRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'user')
      .leftJoinAndSelect('c.court', 'court')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (query.userId) qb.andWhere('c.userId = :userId', { userId: query.userId });
    if (query.courtId) qb.andWhere('c.courtId = :courtId', { courtId: query.courtId });
    const [rows, total] = await qb.getManyAndCount();
    return {
      total,
      page,
      pageSize,
      list: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        nickname: r.user?.nickname || '',
        courtId: r.courtId,
        courtName: r.court?.name || '',
        startTime: r.startTime,
        endTime: r.endTime,
        duration: r.duration,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  private calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
