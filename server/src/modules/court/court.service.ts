import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { Court } from '../../entities/court.entity';
import { CourtReview } from '../../entities/court-review.entity';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class CourtService {
  constructor(
    @InjectRepository(Court)
    private courtRepo: Repository<Court>,
    @InjectRepository(CourtReview)
    private reviewRepo: Repository<CourtReview>,
    @InjectRepository(Favorite)
    private favoriteRepo: Repository<Favorite>,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  /**
   * Search nearby courts — uses distance calculation in JS (SQLite-compatible)
   */
  async findNearby(lat: number, lng: number, radius: number = 5000, filters?: {
    isFree?: boolean;
    isIndoor?: boolean;
    hasLighting?: boolean;
    keyword?: string;
  }) {
    const qb = this.courtRepo.createQueryBuilder('court')
      .where('court.status = :status', { status: 1 });

    if (filters?.isFree !== undefined) {
      qb.andWhere('court.isFree = :isFree', { isFree: filters.isFree });
    }
    if (filters?.isIndoor !== undefined) {
      qb.andWhere('court.isIndoor = :isIndoor', { isIndoor: filters.isIndoor });
    }
    if (filters?.hasLighting !== undefined) {
      qb.andWhere('court.hasLighting = :hasLighting', { hasLighting: filters.hasLighting });
    }
    if (filters?.keyword) {
      qb.andWhere('(court.name LIKE :kw OR court.address LIKE :kw)', {
        kw: `%${filters.keyword}%`,
      });
    }

    const courts = await qb.getMany();

    // Enrich distance + filter by radius in JS (SQLite-compatible)
    const enriched = courts
      .map((court) => {
        const distance = this.calcDistance(lat, lng, Number(court.lat), Number(court.lng));
        return { court, distance };
      })
      .filter(({ distance }) => distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30)
      .map(async ({ court, distance }) => {
        const activePlayers = parseInt(
          (this.redis ? await this.redis.get(`court:${court.id}:active_count`) : '0') || '0',
          10,
        );
        return {
          ...court,
          activePlayers,
          distanceStr: distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`,
          lat: Number(court.lat),
          lng: Number(court.lng),
        };
      });

    return Promise.all(enriched);
  }

  /**
   * Get court detail with reviews
   */
  async getDetail(id: number) {
    const court = await this.courtRepo.findOne({ where: { id } });
    if (!court) throw new NotFoundException('场地不存在');

    const reviews = await this.reviewRepo.find({
      where: { courtId: id },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const activePlayers = parseInt(
      (await this.redis.get(`court:${court.id}:active_count`)) || '0',
      10,
    );

    return {
      ...court,
      activePlayers,
      lat: Number(court.lat),
      lng: Number(court.lng),
      reviews: reviews.map((r) => ({
        id: `rev_${r.id}`,
        reviewerName: r.user?.nickname || '匿名',
        reviewerAvatar: r.user?.avatarUrl || '',
        reviewerLevel: r.user?.level || 1,
        timeStr: this.formatTimeStr(r.createdAt),
        rating: r.rating,
        content: r.content,
        images: r.images || [],
      })),
    };
  }

  /**
   * Add / update review
   */
  async review(userId: number, courtId: number, rating: number, content: string, images?: string[]) {
    const review = this.reviewRepo.create({ userId, courtId, rating, content, images });
    await this.reviewRepo.save(review);

    // Update court average rating
    const avg = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.courtId = :courtId', { courtId })
      .getRawOne();

    await this.courtRepo.update(courtId, {
      rating: avg?.avg ? Math.round(parseFloat(avg.avg) * 10) / 10 : 5.0,
      reviewCount: () => 'reviewCount + 1',
    });

    return { success: true };
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(userId: number, courtId: number) {
    const existing = await this.favoriteRepo.findOne({
      where: { userId, courtId },
    });

    if (existing) {
      await this.favoriteRepo.remove(existing);
      return { favorite: false };
    }

    await this.favoriteRepo.save({ userId, courtId });
    return { favorite: true };
  }

  /**
   * Get user favorites
   */
  async getFavorites(userId: number) {
    const favs = await this.favoriteRepo.find({
      where: { userId },
      relations: { court: true },
      order: { createdAt: 'DESC' },
    });
    return favs.map((f) => f.court);
  }

  /**
   * Create custom court (user contribution)
   */
  async create(data: { name: string; lat: number; lng: number; userId: number; isFree?: boolean; tableCount?: number }) {
    const court = this.courtRepo.create({
      name: data.name,
      address: '用户自定义场地',
      lat: data.lat,
      lng: data.lng,
      isFree: data.isFree !== false,
      tableCount: data.tableCount || 2,
      contributorId: data.userId,
      features: ['用户贡献'],
    });
    return this.courtRepo.save(court);
  }

  private calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private formatTimeStr(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toISOString().slice(0, 10);
  }
}
