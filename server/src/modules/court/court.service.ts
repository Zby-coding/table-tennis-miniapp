import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { Court } from '../../entities/court.entity';
import { CourtReview } from '../../entities/court-review.entity';
import { Favorite } from '../../entities/favorite.entity';
import {
  CourtBackgroundSubmission,
  BackgroundSubmissionStatus,
} from '../../entities/court-background-submission.entity';
import { mapCourtMedia } from './court-enrichment.util';

const MAX_APPROVED_BACKGROUNDS = 3;

@Injectable()
export class CourtService {
  constructor(
    @InjectRepository(Court)
    private courtRepo: Repository<Court>,
    @InjectRepository(CourtReview)
    private reviewRepo: Repository<CourtReview>,
    @InjectRepository(Favorite)
    private favoriteRepo: Repository<Favorite>,
    @InjectRepository(CourtBackgroundSubmission)
    private bgRepo: Repository<CourtBackgroundSubmission>,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async findNearby(lat: number, lng: number, radius: number = 5000, filters?: {
    isFree?: boolean;
    isIndoor?: boolean;
    hasLighting?: boolean;
    keyword?: string;
  }) {
    const deltaLat = radius / 111320;
    const deltaLng = radius / (111320 * Math.cos((lat * Math.PI) / 180));

    const qb = this.courtRepo.createQueryBuilder('court')
      .where('court.status = :status', { status: 1 })
      .andWhere('court.lat BETWEEN :minLat AND :maxLat', {
        minLat: lat - deltaLat,
        maxLat: lat + deltaLat,
      })
      .andWhere('court.lng BETWEEN :minLng AND :maxLng', {
        minLng: lng - deltaLng,
        maxLng: lng + deltaLng,
      });

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

    const courts = await qb.limit(500).getMany();

    const enriched = courts
      .map((court) => {
        const distance = this.calcDistance(lat, lng, Number(court.lat), Number(court.lng));
        return { court, distance };
      })
      .filter(({ distance }) => distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30);
    const keys = enriched.map(({ court }) => `court:${court.id}:active_count`);
    let counts: number[] = enriched.map(() => 0);
    if (this.redis && keys.length > 0) {
      try {
        counts = (await this.redis.mget(...keys)).map((v) => parseInt(v || '0', 10));
      } catch {
        counts = enriched.map(() => 0);
      }
    }

    return enriched.map(({ court, distance }, i) => ({
      ...court,
      ...mapCourtMedia(court),
      activePlayers: counts[i],
      distanceStr: distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`,
      lat: Number(court.lat),
      lng: Number(court.lng),
    }));
  }

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
      (this.redis ? await this.redis.get(`court:${court.id}:active_count`) : '0') || '0',
      10,
    );

    const media = mapCourtMedia(court);
    const eligibility = await this.getBackgroundEligibility(id);

    return {
      ...court,
      ...media,
      ...eligibility,
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

  async review(userId: number, courtId: number, rating: number, content: string, images?: string[]) {
    const review = this.reviewRepo.create({ userId, courtId, rating, content, images });
    await this.reviewRepo.save(review);

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

  async getFavorites(userId: number) {
    const favs = await this.favoriteRepo.find({
      where: { userId },
      relations: { court: true },
      order: { createdAt: 'DESC' },
    });
    return favs.map((f) => ({
      ...f.court,
      ...mapCourtMedia(f.court),
      lat: Number(f.court.lat),
      lng: Number(f.court.lng),
    }));
  }

  async adminListFavorites(query: {
    userId?: number;
    courtId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(query.page || 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const qb = this.favoriteRepo.createQueryBuilder('f')
      .leftJoinAndSelect('f.user', 'user')
      .leftJoinAndSelect('f.court', 'court')
      .orderBy('f.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (query.userId) qb.andWhere('f.userId = :userId', { userId: query.userId });
    if (query.courtId) qb.andWhere('f.courtId = :courtId', { courtId: query.courtId });
    const [rows, total] = await qb.getManyAndCount();
    return {
      total,
      page,
      pageSize,
      list: rows.map((f) => ({
        id: f.id,
        userId: f.userId,
        nickname: f.user?.nickname || '',
        courtId: f.courtId,
        courtName: f.court?.name || '',
        courtAddress: f.court?.address || '',
        createdAt: f.createdAt,
      })),
    };
  }

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

  async getBackgroundEligibility(courtId: number) {
    const court = await this.courtRepo.findOne({ where: { id: courtId } });
    if (!court) throw new NotFoundException('场地不存在');

    const media = mapCourtMedia(court);
    const approvedCount = await this.bgRepo.count({
      where: { courtId, status: 'approved' as BackgroundSubmissionStatus },
    });
    const hasUsablePhoto = (media.livePhotos?.length || 0) > 0 || Boolean(media.photo);
    const isPlatformReal = media.photoSource === 'platform' && hasUsablePhoto;
    const showStockHint = !hasUsablePhoto || media.photoSource !== 'platform';

    let canContribute = true;
    let reason = '';
    if (approvedCount >= MAX_APPROVED_BACKGROUNDS) {
      canContribute = false;
      reason = `该场地已有 ${MAX_APPROVED_BACKGROUNDS} 张审核通过的实拍，暂不可再上传`;
    } else if (isPlatformReal) {
      canContribute = false;
      reason = '当前已是真实场点实拍，暂无需上传示意替换';
    }

    return {
      canContribute,
      reason,
      approvedCount,
      maxApproved: MAX_APPROVED_BACKGROUNDS,
      photoSource: media.photoSource,
      showStockHint,
      hasUsablePhoto,
    };
  }

  async submitBackground(userId: number, courtId: number, url: string) {
    if (!url || typeof url !== 'string') throw new BadRequestException('请先上传图片');
    const eligibility = await this.getBackgroundEligibility(courtId);
    if (!eligibility.canContribute) {
      throw new BadRequestException(eligibility.reason || '当前不可投稿');
    }
    const pending = await this.bgRepo.findOne({
      where: { courtId, userId, status: 'pending' as BackgroundSubmissionStatus },
    });
    if (pending) throw new BadRequestException('你已有待审核的投稿，请等待管理员处理');

    const relative = this.normalizeUploadPath(url);

    const row = this.bgRepo.create({
      courtId,
      userId,
      url: relative,
      status: 'pending',
    });
    await this.bgRepo.save(row);
    return { success: true, id: row.id, message: '已提交审核，通过后将更新场点背景' };
  }

  async adminListBackgrounds(query: {
    status?: BackgroundSubmissionStatus | '';
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(query.page || 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const qb = this.bgRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'user')
      .leftJoinAndSelect('s.court', 'court')
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    const [rows, total] = await qb.getManyAndCount();
    return {
      total,
      page,
      pageSize,
      list: rows.map((s) => ({
        id: s.id,
        courtId: s.courtId,
        courtName: s.court?.name || '',
        userId: s.userId,
        nickname: s.user?.nickname || '',
        url: s.url,
        status: s.status,
        rejectReason: s.rejectReason,
        reviewedBy: s.reviewedBy,
        reviewedAt: s.reviewedAt,
        createdAt: s.createdAt,
      })),
    };
  }

  async approveBackground(submissionId: number, adminId: number) {
    const row = await this.bgRepo.findOne({ where: { id: submissionId } });
    if (!row) throw new NotFoundException('投稿不存在');
    if (row.status !== 'pending') throw new BadRequestException('该投稿已处理');

    const safeUrl = this.normalizeUploadPath(row.url);
    row.url = safeUrl;

    const court = await this.courtRepo.findOne({ where: { id: row.courtId } });
    if (!court) throw new NotFoundException('场地不存在');

    const photos = Array.isArray(court.photos) ? [...court.photos] : [];
    if (!photos.includes(safeUrl)) photos.unshift(safeUrl);
    const facilityPhotos = Array.isArray(court.facilityPhotos) ? [...court.facilityPhotos] : [];
    if (!facilityPhotos.includes(safeUrl)) facilityPhotos.unshift(safeUrl);

    const meta = {
      ...(court.enrichmentMeta || {}),
      photoSource: 'platform' as const,
      sources: [...new Set([...(court.enrichmentMeta?.sources || []), 'user_upload'])],
      enrichedAt: new Date().toISOString(),
      searchQuery: court.enrichmentMeta?.searchQuery || court.name,
      confidence: 'high' as const,
    };

    await this.courtRepo.update(court.id, {
      photos,
      facilityPhotos,
      enrichmentMeta: meta,
    });

    row.status = 'approved';
    row.reviewedBy = adminId;
    row.reviewedAt = new Date();
    row.rejectReason = null;
    await this.bgRepo.save(row);

    return { success: true, courtId: court.id };
  }

  async rejectBackground(submissionId: number, adminId: number, reason?: string) {
    const row = await this.bgRepo.findOne({ where: { id: submissionId } });
    if (!row) throw new NotFoundException('投稿不存在');
    if (row.status !== 'pending') throw new BadRequestException('该投稿已处理');
    row.status = 'rejected';
    row.reviewedBy = adminId;
    row.reviewedAt = new Date();
    row.rejectReason = reason || '不符合实拍要求';
    await this.bgRepo.save(row);
    return { success: true };
  }

  private normalizeUploadPath(url: string): string {
    const raw = String(url || '').trim();
    if (!raw) throw new BadRequestException('请先上传图片');
    if (/[\s\\]/.test(raw) || raw.includes('..') || /:\/\//.test(raw)) {
      throw new BadRequestException('图片地址不合法');
    }
    let pathOnly = raw;
    if (raw.startsWith('/uploads/')) {
      pathOnly = raw;
    } else if (raw.startsWith('uploads/')) {
      pathOnly = `/${raw}`;
    } else {
      throw new BadRequestException('仅支持本站上传的图片');
    }
    if (!/^\/uploads\/[A-Za-z0-9._/-]+$/.test(pathOnly)) {
      throw new BadRequestException('图片地址不合法');
    }
    return pathOnly;
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
