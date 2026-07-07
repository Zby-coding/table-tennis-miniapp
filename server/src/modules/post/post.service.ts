import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchPost, PostStatus } from '../../entities/match-post.entity';
import { PostJoin } from '../../entities/post-join.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(MatchPost)
    private postRepo: Repository<MatchPost>,
    @InjectRepository(PostJoin)
    private joinRepo: Repository<PostJoin>,
  ) {}

  async findPosts(filters?: {
    status?: string;
    level?: string;
    timeFilter?: string;
    keyword?: string;
    userId?: number;
  }) {
    // Build query
    const qb = this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.organizer', 'organizer')
      .leftJoinAndSelect('post.court', 'court')
      .leftJoinAndSelect('post.joins', 'joins')
      .leftJoinAndSelect('joins.user', 'joinUser');

    if (filters?.status) {
      qb.andWhere('post.status = :status', { status: filters.status });
    }
    if (filters?.keyword) {
      qb.andWhere('(post.title LIKE :kw OR court.name LIKE :kw OR organizer.nickname LIKE :kw)', {
        kw: `%${filters.keyword}%`,
      });
    }
    if (filters?.level) {
      qb.andWhere('organizer.level = :level', {
        level: filters.level,
      });
    }
    qb.orderBy('post.createdAt', 'DESC').limit(50);

    const posts = await qb.getMany();

    return posts.map((p) => ({
      id: `post_${p.id}`,
      organizerName: p.organizer?.nickname ?? '匿名',
      organizerAvatar: p.organizer?.avatarUrl ?? '',
      organizerLevel: this.levelLabel(p.organizer?.level ?? 1),
      title: p.title,
      locationName: p.court?.name ?? '未知场地',
      timeStr: p.startTime,
      joinedCount: p.joinedCount,
      totalCapacity: p.totalCapacity,
      feeType: p.feeType,
      feeValue: p.feeValue,
      description: p.description,
      status: this.mapStatus(p.status),
      participants: p.joins.map((j) => j.user?.avatarUrl).filter(Boolean),
      isJoinedByMe: filters?.userId
        ? p.joins.some((j) => j.userId === filters.userId)
        : false,
      createdAt: p.createdAt,
    }));
  }

  async getMyPosts(userId: number) {
    // Return posts the user created or joined
    const created = await this.postRepo.find({
      where: { userId },
      relations: { organizer: true, court: true, joins: { user: true } },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return created.map((p) => ({
      id: `post_${p.id}`,
      organizerName: p.organizer?.nickname ?? '匿名',
      organizerAvatar: p.organizer?.avatarUrl ?? '',
      organizerLevel: this.levelLabel(p.organizer?.level ?? 1),
      title: p.title,
      locationName: p.court?.name ?? '未知场地',
      timeStr: p.startTime,
      joinedCount: p.joinedCount,
      totalCapacity: p.totalCapacity,
      feeType: p.feeType,
      feeValue: p.feeValue,
      description: p.description,
      status: this.mapStatus(p.status),
      participants: p.joins.map((j) => j.user?.avatarUrl).filter(Boolean),
      isJoinedByMe: true,
      createdAt: p.createdAt,
    }));
  }

  async createPost(
    userId: number,
    data: {
      title: string;
      courtId: number;
      startTime: string;
      totalCapacity: number;
      feeType: string;
      feeValue: number;
      description?: string;
    },
  ) {
    if (!data.totalCapacity || data.totalCapacity < 2)
      throw new BadRequestException('totalCapacity 至少为 2');
    const post = this.postRepo.create({
      userId,
      title: data.title,
      courtId: data.courtId,
      startTime: data.startTime,
      totalCapacity: data.totalCapacity,
      joinedCount: 1,
      feeType: data.feeType || 'AA制',
      feeValue: data.feeValue || 0,
      description: data.description,
      status: PostStatus.RECRUITING,
    });
    await this.postRepo.save(post);
    await this.joinRepo.save({ postId: post.id, userId, status: 'approved' });
    return post;
  }

  async joinPost(userId: number, postId: number) {
    const existing = await this.joinRepo.findOne({ where: { postId, userId } });
    if (existing) throw new BadRequestException('您已加入该约球');

    await this.joinRepo.manager.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(MatchPost)
        .set({
          joinedCount: () => 'joinedCount + 1',
          status: () => `CASE WHEN joinedCount + 1 >= totalCapacity THEN '${PostStatus.FULL}' ELSE '${PostStatus.RECRUITING}' END`,
        })
        .where('id = :postId', { postId })
        .andWhere('joinedCount < totalCapacity')
        .andWhere('status = :recruitingStatus', { recruitingStatus: PostStatus.RECRUITING })
        .execute();

      if (result.affected === 0) {
        throw new BadRequestException('该约球已满员或已结束');
      }

      await manager.save(PostJoin, { postId, userId, status: 'approved' });
    });

    return { success: true };
  }

  private levelLabel(level?: number): string {
    const labels: Record<number, string> = { 1: 'L1 萌新', 2: 'L2 进阶', 3: 'L3 高级', 4: 'Pro 大神' };
    return labels[level ?? 1] ?? 'L1 萌新';
  }

  private levelToNumber(levelLabel: string): number {
    const map: Record<string, number> = { 'L1 萌新': 1, 'L2 进阶': 2, 'L3 高级': 3, 'Pro 大神': 4 };
    return map[levelLabel] ?? 1;
  }

  private mapStatus(status: string): string {
    const map: Record<string, string> = {
      recruiting: '招募中', full: '已满员', finished: '已结束', cancelled: '已取消',
    };
    return map[status] ?? status;
  }
}
