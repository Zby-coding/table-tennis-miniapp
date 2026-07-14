import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly userService: UserService,
  ) {}

  async getOverview() {
    const [total, active, disabled, admins] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepo.count({ where: { status: UserStatus.DISABLED } }),
      this.userRepo.count({ where: { role: UserRole.ADMIN } }),
    ]);
    return { totalUsers: total, activeUsers: active, disabledUsers: disabled, adminUsers: admins };
  }

  async listUsers(filters: {
    keyword?: string; status?: string; level?: number; city?: string; page?: number; pageSize?: number;
  }) {
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || 20)));
    const qb = this.userRepo.createQueryBuilder('user');

    if (filters.keyword?.trim()) {
      const keyword = `%${filters.keyword.trim()}%`;
      qb.andWhere('(user.nickname LIKE :keyword OR CAST(user.id AS TEXT) LIKE :keyword)', { keyword });
    }
    if (filters.status) qb.andWhere('user.status = :status', { status: filters.status });
    if (filters.level) qb.andWhere('user.level = :level', { level: filters.level });
    if (filters.city?.trim()) qb.andWhere('user.city LIKE :city', { city: `%${filters.city.trim()}%` });

    const [users, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: users.map((user) => this.toListItem(user)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getUserDetail(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { achievements: true, checkins: true, joins: true, wonMatches: true, lostMatches: true },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return {
      ...this.toListItem(user),
      achievements: (user.achievements || []).length,
      checkins: (user.checkins || []).length,
      joinedPosts: (user.joins || []).length,
      matches: (user.wonMatches || []).length + (user.lostMatches || []).length,
      adminNote: user.adminNote || '',
    };
  }

  async updateStatus(id: number, status: 'active' | 'disabled', actorId?: number) {
    if (actorId && id === actorId && status === UserStatus.DISABLED) {
      throw new BadRequestException('不能停用当前管理员账号');
    }
    await this.ensureUser(id);
    await this.userRepo.update(id, { status: status as UserStatus });
    return this.getUserDetail(id);
  }

  async updateRole(id: number, role: 'user' | 'admin', actorId?: number) {
    if (actorId && id === actorId && role !== UserRole.ADMIN) {
      throw new BadRequestException('不能取消当前管理员的管理员角色');
    }
    await this.ensureUser(id);
    await this.userRepo.update(id, { role: role as UserRole });
    return this.getUserDetail(id);
  }

  async updateNote(id: number, note?: string) {
    await this.ensureUser(id);
    await this.userRepo.update(id, { adminNote: note?.trim() || null });
    return this.getUserDetail(id);
  }

  private async ensureUser(id: number) {
    return this.userService.findById(id);
  }

  private toListItem(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      city: user.city,
      style: user.style,
      level: user.level,
      role: user.role,
      status: user.status,
      totalHours: user.totalHours,
      totalMatches: user.totalMatches,
      wins: user.wins,
      winRate: user.totalMatches > 0 ? Math.round((user.wins / user.totalMatches) * 1000) / 10 : 0,
      points: user.points,
      checkinStreak: user.checkinStreak,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
    };
  }
}
