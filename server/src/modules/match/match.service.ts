import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MatchRecord } from '../../entities/match-record.entity';
import { User } from '../../entities/user.entity';
import { AchievementService } from '../achievement/achievement.service';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(MatchRecord)
    private matchRepo: Repository<MatchRecord>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private achievementService: AchievementService,
    private dataSource: DataSource,
  ) {}

  async getRecords(userId: number, page: number = 1, limit: number = 20) {
    const [records, total] = await this.matchRepo.findAndCount({
      where: [{ winnerId: userId }, { loserId: userId }],
      relations: { winner: true, loser: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: records.map((r) => ({
        id: `rec_${r.id}`,
        opponentName: r.winnerId === userId ? r.loser?.nickname : r.winner?.nickname,
        opponentLevel: this.levelLabel(r.winnerId === userId ? r.loser?.level : r.winner?.level),
        opponentAvatar: r.winnerId === userId ? r.loser?.avatarUrl : r.winner?.avatarUrl,
        matchTime: r.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        myScore: r.winnerId === userId ? r.winnerScore : r.loserScore,
        opponentScore: r.winnerId === userId ? r.loserScore : r.winnerScore,
        isWin: r.winnerId === userId,
        locationName: r.locationName ?? '未知场地',
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async addRecord(data: {
    winnerId: number;
    loserId: number;
    winnerScore: number;
    loserScore: number;
    locationName?: string;
    courtId?: number;
    playedAt?: Date;
  }) {
    if (data.winnerId === data.loserId) {
      throw new BadRequestException('不能和自己比赛');
    }
    const record = this.matchRepo.create(data);

    await this.dataSource.transaction(async (manager) => {
      // Save the match record
      await manager.save(record);

      // Lock both user rows to prevent concurrent lost-updates, then increment atomically
      await manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id IN (:...ids)', { ids: [data.winnerId, data.loserId] })
        .getMany();

      // Batch update: increment totalMatches for both, wins for winner only
      await Promise.all([
        manager.increment(User, { id: data.winnerId }, 'totalMatches', 1),
        manager.increment(User, { id: data.winnerId }, 'wins', 1),
        manager.increment(User, { id: data.loserId }, 'totalMatches', 1),
      ]);

      // Check consecutive wins inside transaction for consistency
      const recentMatches = await manager.find(MatchRecord, {
        where: [{ winnerId: data.winnerId }, { loserId: data.winnerId }],
        order: { createdAt: 'DESC' },
        take: 5,
      });
      const consecutiveWins = recentMatches.every((m) => m.winnerId === data.winnerId);
      if (recentMatches.length >= 5 && consecutiveWins) {
        // Delegate to achievement service's own transaction-aware logic
        await this.achievementService.checkAndAward(data.winnerId, 'swift_wins');
      }
    });

    return record;
  }

  async findNearbyPlayers(userId: number, lat: number, lng: number, radius: number = 10000) {
    // Pre-compute bounding box to filter geographically in the database
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
    const latMin = lat - latDelta;
    const latMax = lat + latDelta;
    const lngMin = lng - lngDelta;
    const lngMax = lng + lngDelta;

    const players = await this.userRepo
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .andWhere('user.homeLat IS NOT NULL')
      .andWhere('user.homeLng IS NOT NULL')
      .andWhere('user.homeLat BETWEEN :latMin AND :latMax', { latMin, latMax })
      .andWhere('user.homeLng BETWEEN :lngMin AND :lngMax', { lngMin, lngMax })
      .orderBy('(ABS(user.homeLat - :lat) + ABS(user.homeLng - :lng))', 'ASC')
      .setParameters({ lat, lng })
      .getMany();

    // Calculate distances in JS (SQLite-compatible)
    const withDistance = players
      .map((p) => ({ player: p, distance: this.calcDistance(lat, lng, Number(p.homeLat), Number(p.homeLng)) }))
      .filter(({ distance }) => distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    return withDistance.map(({ player: p }) => ({
      id: p.id,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
      level: this.levelLabel(p.level),
      style: p.style,
      winRate: p.totalMatches > 0 ? Math.round((p.wins / p.totalMatches) * 100) : 0,
      totalMatches: p.totalMatches,
    }));
  }

  private levelLabel(level?: number): string {
    const labels: Record<number, string> = { 1: 'L1 萌新', 2: 'L2 进阶', 3: 'L3 高级', 4: 'Pro 大神' };
    return labels[level ?? 1] ?? 'L1 萌新';
  }

  private calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
