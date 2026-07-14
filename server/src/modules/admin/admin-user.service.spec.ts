import { AdminUserService } from './admin-user.service';

const makeUser = (overrides = {}) => ({
  id: 1,
  nickname: '球友',
  avatarUrl: null,
  city: '杭州',
  style: '横拍弧圈',
  level: 2,
  role: 'user',
  status: 'active',
  totalHours: 12,
  totalMatches: 10,
  wins: 6,
  points: 128,
  checkinStreak: 3,
  lastActiveAt: new Date('2026-07-12T08:00:00.000Z'),
  createdAt: new Date('2026-07-01T08:00:00.000Z'),
  ...overrides,
});

describe('AdminUserService', () => {
  it('filters users and returns pagination metadata', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[makeUser()], 1]),
    };
    const repo = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) };
    const service = new AdminUserService(repo as any, {} as any);

    const result = await service.listUsers({ keyword: '球友', status: 'active', page: 2, pageSize: 20 } as any);

    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ page: 2, pageSize: 20, total: 1, totalPages: 1 }));
    expect(result.items[0]).toEqual(expect.objectContaining({ id: 1, nickname: '球友', winRate: 60 }));
  });

  it('updates status without deleting the user or history', async () => {
    const user = makeUser({ id: 7, status: 'disabled' });
    const repo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue({ ...user, achievements: [], checkins: [], joins: [], wonMatches: [], lostMatches: [] }),
    };
    const userService = { findById: jest.fn().mockResolvedValue(makeUser({ id: 7 })) };
    const service = new AdminUserService(repo as any, userService as any);

    const result = await service.updateStatus(7, 'disabled', 1);

    expect(userService.findById).toHaveBeenCalledWith(7);
    expect(repo.update).toHaveBeenCalledWith(7, { status: 'disabled' });
    expect(result).toEqual(expect.objectContaining({ id: 7, status: 'disabled', matches: 0 }));
  });
});
