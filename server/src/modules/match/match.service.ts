import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const record = this.matchRepo.create(data);
    await this.matchRepo.save(record);

    // Batch update: increment totalMatches for both, wins for winner only
    await Promise.all([
      this.userRepo.increment({ id: data.winnerId }, 'totalMatches', 1),
      this.userRepo.increment({ id: data.winnerId }, 'wins', 1),
      this.userRepo.increment({ id: data.loserId }, 'totalMatches', 1),
    ]);

    // Check consecutive wins (not total wins)
    const recentMatches = await this.matchRepo.find({
      where: [{ winnerId: data.winnerId }, { loserId: data.winnerId }],
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const consecutiveWins = recentMatches.every((m) => m.winnerId === data.winnerId);
    if (recentMatches.length >= 5 && consecutiveWins) {
      await this.achievementService.checkAndAward(data.winnerId, 'swift_wins');
    }

    return record;
  }

  async findNearbyPlayers(userId: number, lat: number, lng: number, radius: number = 10000) {
    const players = await this.userRepo
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .andWhere('user.homeLat IS NOT NULL')
      .andWhere('user.homeLng IS NOT NULL')
      .limit(50)
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
