import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchPost, PostStatus } from '../../entities/match-post.entity';
import { PostJoin } from '../../entities/post-join.entity';

export interface PostFilters {
  status?: string;
  level?: string;
  timeFilter?: string;
  keyword?: string;
  userId?: number;
}

export enum JoinStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(MatchPost)
    private postRepo: Repository<MatchPost>,
    @InjectRepository(PostJoin)
    private joinRepo: Repository<PostJoin>,
  ) {}

  async findPosts(filters?: PostFilters) {
    const qb = this.buildPostQuery();
    if (filters?.status) {
      qb.andWhere('post.status = :status', { status: filters.status });
    } else {
      qb.andWhere('post.status IN (:...activeStatuses)', {
        activeStatuses: [PostStatus.RECRUITING, PostStatus.FULL],
      });
    }
    this.applyListFilters(qb, filters);
    qb.orderBy('post.createdAt', 'DESC').limit(50);
    const posts = await qb.getMany();
    return posts.map((p) => this.toPostDto(p, filters?.userId));
  }

  async getMyPosts(userId: number, filters?: Omit<PostFilters, 'userId'>) {
    const qb = this.buildPostQuery()
      .where('(post.userId = :userId OR joins.userId = :userId)', { userId })
      .andWhere('post.status != :cancelled', { cancelled: PostStatus.CANCELLED });
    this.applyListFilters(qb, filters);
    qb.orderBy('post.createdAt', 'DESC').limit(50);
    const posts = await qb.getMany();
    return posts.map((p) => this.toPostDto(p, userId));
  }

  async getPostDetail(postId: number, userId?: number) {
    const post = await this.loadPost(postId);
    if (post.status === PostStatus.CANCELLED) {
      const isOrganizer = userId != null && post.userId === userId;
      const isMember = userId != null
        && (post.joins ?? []).some((j) => j.userId === userId && j.status === JoinStatus.APPROVED);
      if (!isOrganizer && !isMember) {
        throw new NotFoundException('约球不存在');
      }
    }
    return this.toPostDetailDto(post, userId);
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
      requireApproval?: boolean;
    },
  ) {
    if (!data.totalCapacity || data.totalCapacity < 2) {
      throw new BadRequestException('totalCapacity 至少为 2');
    }
    const post = this.postRepo.create({
      userId,
      title: data.title,
      courtId: data.courtId,
      startTime: new Date(data.startTime),
      totalCapacity: data.totalCapacity,
      joinedCount: 1,
      feeType: data.feeType || '免费',
      feeValue: data.feeValue || 0,
      description: data.description,
      status: PostStatus.RECRUITING,
      requireApproval: data.requireApproval !== false,
    });
    await this.postRepo.save(post);
    await this.joinRepo.save({
      postId: post.id,
      userId,
      status: JoinStatus.APPROVED,
    });
    return this.toPostDetailDto(await this.loadPost(post.id), userId);
  }

  async updatePost(
    userId: number,
    postId: number,
    data: {
      title?: string;
      courtId?: number;
      startTime?: string;
      totalCapacity?: number;
      feeType?: string;
      feeValue?: number;
      description?: string;
      requireApproval?: boolean;
    },
  ) {
    const post = await this.loadPost(postId);
    if (post.userId !== userId) throw new ForbiddenException('只能编辑自己发布的约球');
    if (post.status !== PostStatus.RECRUITING) {
      throw new BadRequestException('仅招募中的约球可编辑');
    }
    if (data.totalCapacity !== undefined && data.totalCapacity < post.joinedCount) {
      throw new BadRequestException('人数上限不能小于已加入人数');
    }

    if (data.title !== undefined) post.title = data.title;
    if (data.courtId !== undefined) post.courtId = data.courtId;
    if (data.startTime !== undefined) post.startTime = new Date(data.startTime);
    if (data.totalCapacity !== undefined) post.totalCapacity = data.totalCapacity;
    if (data.feeType !== undefined) post.feeType = data.feeType;
    if (data.feeValue !== undefined) post.feeValue = data.feeValue;
    if (data.description !== undefined) post.description = data.description;
    if (data.requireApproval !== undefined) post.requireApproval = data.requireApproval;

    if (post.joinedCount >= post.totalCapacity) {
      post.status = PostStatus.FULL;
    }

    await this.postRepo.save(post);
    return this.toPostDetailDto(await this.loadPost(postId), userId);
  }

  async deletePost(userId: number, postId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('约球不存在');
    if (post.userId !== userId) throw new ForbiddenException('只能删除自己发布的约球');

    post.status = PostStatus.CANCELLED;
    await this.postRepo.save(post);
    return { success: true };
  }

  async joinPost(userId: number, postId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('约球不存在');
    if (post.userId === userId) throw new BadRequestException('您是发起人，无需加入');
    if (post.status !== PostStatus.RECRUITING) {
      throw new BadRequestException('该约球已满员或已结束');
    }

    const existing = await this.joinRepo.findOne({ where: { postId, userId } });
    if (existing) {
      if (existing.status === JoinStatus.PENDING) {
        throw new BadRequestException('您的申请正在审批中');
      }
      if (existing.status === JoinStatus.APPROVED) {
        throw new BadRequestException('您已加入该约球');
      }
    }

    if (post.joinedCount >= post.totalCapacity) {
      throw new BadRequestException('该约球已满员或已结束');
    }

    if (post.requireApproval) {
      if (existing?.status === JoinStatus.REJECTED) {
        existing.status = JoinStatus.PENDING;
        await this.joinRepo.save(existing);
      } else {
        await this.joinRepo.save({ postId, userId, status: JoinStatus.PENDING });
      }
      return { success: true, status: JoinStatus.PENDING, message: '申请已提交，等待发起人审批' };
    }

    await this.approveJoinInternal(postId, userId);
    return { success: true, status: JoinStatus.APPROVED, message: '加入成功' };
  }

  async leavePost(userId: number, postId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('约球不存在');
    if (post.userId === userId) {
      throw new BadRequestException('发起人请使用删除约球');
    }

    const join = await this.joinRepo.findOne({ where: { postId, userId } });
    if (!join) throw new BadRequestException('您未加入该约球');

    if (join.status === JoinStatus.PENDING || join.status === JoinStatus.REJECTED) {
      await this.joinRepo.remove(join);
      return { success: true, message: '已取消申请' };
    }

    await this.joinRepo.manager.transaction(async (manager) => {
      await manager.remove(PostJoin, join);
      await manager
        .createQueryBuilder()
        .update(MatchPost)
        .set({
          joinedCount: () => 'CASE WHEN joinedCount > 0 THEN joinedCount - 1 ELSE 0 END',
          status: PostStatus.RECRUITING,
        })
        .where('id = :postId', { postId })
        .andWhere('status IN (:...statuses)', { statuses: [PostStatus.RECRUITING, PostStatus.FULL] })
        .execute();
    });

    return { success: true, message: '已退出约球' };
  }

  async approveJoin(organizerId: number, postId: number, joinId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('约球不存在');
    if (post.userId !== organizerId) throw new ForbiddenException('仅发起人可审批');

    const join = await this.joinRepo.findOne({ where: { id: joinId, postId } });
    if (!join) throw new NotFoundException('申请不存在');
    if (join.status !== JoinStatus.PENDING) {
      throw new BadRequestException('该申请已处理');
    }

    await this.approveJoinInternal(postId, join.userId, join);
    return { success: true, message: '已通过申请' };
  }

  async rejectJoin(organizerId: number, postId: number, joinId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('约球不存在');
    if (post.userId !== organizerId) throw new ForbiddenException('仅发起人可审批');

    const join = await this.joinRepo.findOne({ where: { id: joinId, postId } });
    if (!join) throw new NotFoundException('申请不存在');
    if (join.status !== JoinStatus.PENDING) {
      throw new BadRequestException('该申请已处理');
    }

    join.status = JoinStatus.REJECTED;
    await this.joinRepo.save(join);
    return { success: true, message: '已拒绝申请' };
  }

  private async approveJoinInternal(postId: number, userId: number, joinRecord?: PostJoin) {
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

      if (joinRecord) {
        joinRecord.status = JoinStatus.APPROVED;
        await manager.save(PostJoin, joinRecord);
      } else {
        await manager.save(PostJoin, { postId, userId, status: JoinStatus.APPROVED });
      }
    });
  }

  private buildPostQuery() {
    return this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.organizer', 'organizer')
      .leftJoinAndSelect('post.court', 'court')
      .leftJoinAndSelect('post.joins', 'joins')
      .leftJoinAndSelect('joins.user', 'joinUser');
  }

  private applyListFilters(
    qb: ReturnType<Repository<MatchPost>['createQueryBuilder']>,
    filters?: PostFilters,
  ) {
    if (filters?.keyword) {
      qb.andWhere('(post.title LIKE :kw OR court.name LIKE :kw OR organizer.nickname LIKE :kw)', {
        kw: `%${filters.keyword}%`,
      });
    }
    if (filters?.level && filters.level !== '全部') {
      qb.andWhere('organizer.level = :level', {
        level: this.levelToNumber(filters.level),
      });
    }
    this.applyTimeFilter(qb, filters?.timeFilter);
  }

  private async loadPost(postId: number) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: { organizer: true, court: true, joins: { user: true } },
    });
    if (!post) throw new NotFoundException('约球不存在');
    return post;
  }

  private toPostDto(p: MatchPost, userId?: number) {
    const approvedJoins = p.joins?.filter((j) => j.status === JoinStatus.APPROVED) ?? [];
    const pendingJoins = p.joins?.filter((j) => j.status === JoinStatus.PENDING) ?? [];
    const myJoin = userId ? p.joins?.find((j) => j.userId === userId) : undefined;
    const isOrganizerByMe = userId ? p.userId === userId : false;

    return {
      id: `post_${p.id}`,
      courtId: p.courtId,
      organizerName: p.organizer?.nickname ?? '匿名',
      organizerAvatar: p.organizer?.avatarUrl ?? '',
      organizerLevel: this.levelLabel(p.organizer?.level ?? 1),
      title: p.title,
      locationName: p.court?.name ?? '未知场地',
      timeStr: this.formatTimeStr(p.startTime),
      startTime: p.startTime,
      joinedCount: p.joinedCount,
      totalCapacity: p.totalCapacity,
      feeType: p.feeType,
      feeValue: p.feeValue,
      description: p.description ?? '',
      status: this.mapStatus(p.status, p.joinedCount, p.totalCapacity),
      requireApproval: p.requireApproval,
      pendingCount: isOrganizerByMe ? pendingJoins.length : 0,
      participants: approvedJoins.map((j) => j.user?.avatarUrl).filter(Boolean),
      isJoinedByMe: myJoin?.status === JoinStatus.APPROVED,
      isPendingByMe: myJoin?.status === JoinStatus.PENDING,
      myJoinStatus: myJoin?.status ?? null,
      isOrganizerByMe,
      createdAt: p.createdAt,
    };
  }

  private toPostDetailDto(p: MatchPost, userId?: number) {
    const base = this.toPostDto(p, userId);
    const isOrganizer = userId != null && p.userId === userId;
    const approvedMembers = (p.joins ?? [])
      .filter((j) => j.status === JoinStatus.APPROVED)
      .map((j) => ({
        joinId: j.id,
        userId: j.userId,
        nickname: j.user?.nickname ?? '球友',
        avatar: j.user?.avatarUrl ?? '',
        level: this.levelLabel(j.user?.level ?? 1),
        status: j.status,
        isOrganizer: j.userId === p.userId,
      }));

    const pendingMembers = isOrganizer
      ? (p.joins ?? [])
          .filter((j) => j.status === JoinStatus.PENDING)
          .map((j) => ({
            joinId: j.id,
            userId: j.userId,
            nickname: j.user?.nickname ?? '球友',
            avatar: j.user?.avatarUrl ?? '',
            level: this.levelLabel(j.user?.level ?? 1),
            status: j.status,
            isOrganizer: false,
          }))
      : [];

    return {
      ...base,
      courtAddress: p.court?.address ?? '',
      courtLat: p.court?.lat ? Number(p.court.lat) : null,
      courtLng: p.court?.lng ? Number(p.court.lng) : null,
      members: approvedMembers,
      pendingMembers,
      // 非发起人看不到真实 pending 人数
      pendingCount: isOrganizer ? pendingMembers.length : 0,
    };
  }

  private getStartHourExpr(): string {
    const dbType = String(this.postRepo.manager.connection.options.type);
    if (dbType.includes('sqlite')) {
      return "CAST(strftime('%H', post.startTime) AS INTEGER)";
    }
    return 'HOUR(post.startTime)';
  }

  private applyTimeFilter(qb: ReturnType<Repository<MatchPost>['createQueryBuilder']>, timeFilter?: string) {
    if (!timeFilter || timeFilter === '全部') return;

    const hour = this.getStartHourExpr();
    if (timeFilter === '上午') {
      qb.andWhere(`${hour} >= 6 AND ${hour} < 12`);
    } else if (timeFilter === '下午') {
      qb.andWhere(`${hour} >= 12 AND ${hour} < 18`);
    } else if (timeFilter === '晚间') {
      qb.andWhere(`(${hour} >= 18 OR ${hour} < 6)`);
    }
  }

  private formatTimeStr(startTime: Date | string): string {
    const d = new Date(startTime);
    if (Number.isNaN(d.getTime())) return String(startTime);

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs > 0 && diffMs < 60 * 60 * 1000) {
      const mins = Math.max(1, Math.round(diffMs / 60000));
      return `${mins}分钟后开打`;
    }

    const hour = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const timePart = `${hour}:${min}`;

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayDiff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (dayDiff === 0) return `今天 ${timePart}`;
    if (dayDiff === 1) return `明天 ${timePart}`;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${timePart}`;
  }

  private levelLabel(level?: number): string {
    const labels: Record<number, string> = { 1: 'L1 萌新', 2: 'L2 进阶', 3: 'L3 高级', 4: 'Pro 大神' };
    return labels[level ?? 1] ?? 'L1 萌新';
  }

  private levelToNumber(levelLabel: string): number {
    const map: Record<string, number> = { 'L1 萌新': 1, 'L2 进阶': 2, 'L3 高级': 3, 'Pro 大神': 4 };
    return map[levelLabel] ?? 1;
  }

  private mapStatus(status: string, joinedCount: number, totalCapacity: number): string {
    if (status === PostStatus.RECRUITING && joinedCount === totalCapacity - 1) {
      return '最后1席';
    }
    const map: Record<string, string> = {
      recruiting: '招募中',
      full: '已满员',
      finished: '已结束',
      cancelled: '已取消',
    };
    return map[status] ?? status;
  }
}
