import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
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

      // 5. Update user stats (credit on checkout, not here)
      // 6. Check achievements
      await this.achievementService.checkAndAward(userId, 'first_checkin');

      return {
        success: true, courtId,
        activePlayers: await this.redis.get(courtCountKey),
      };
    } catch (err) {
      // Rollback Redis guard on DB failure
      await this.redis.del(activeKey);
      throw err;
    }
  }

  async checkout(userId: number) {
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

  async getActiveCount(courtId: number) {
    // No Redis fallback: return 0 active
    if (!this.redis) return { count: 0, players: [] };

    const count = await this.redis.get(`court:${courtId}:active_count`);
    const userIds = await this.redis.smembers(`court:${courtId}:active_users`);

    const users = userIds.length > 0
      ? await this.userRepo.findBy({ id: In(userIds.map(Number)) } as any)
      : [];

    return {
      count: parseInt(count || '0', 10),
      players: users.map((u) => ({
        id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl,
      })),
    };
  }

  async getUserStatus(userId: number) {
    if (!this.redis) return { isCheckedIn: false };

    const activeKey = `user:${userId}:checkin`;
    const courtId = await this.redis.get(activeKey);
    if (!courtId) return { isCheckedIn: false };

    const checkinTime = await this.redis.get(`user:${userId}:checkin_time`);
    const duration = checkinTime ? Math.round((Date.now() - parseInt(checkinTime)) / 60000) : 0;

    return { isCheckedIn: true, courtId: Number(courtId), duration };
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
