import { UserService } from './user.service';

describe('UserService user management', () => {
  const user = {
    id: 7,
    nickname: '球友',
    avatarUrl: null,
    city: '南阳',
    style: '削球',
    level: 2,
    role: 'user',
    status: 'active',
    totalHours: 12,
    totalMatches: 10,
    wins: 6,
    points: 180,
    checkinStreak: 3,
    achievements: [],
  };

  it('updates editable profile fields and returns the refreshed management profile', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const checkinRepo = { count: jest.fn().mockResolvedValue(3) };
    const favoriteRepo = { count: jest.fn().mockResolvedValue(2) };
    const service = new UserService(repo as any, checkinRepo as any, favoriteRepo as any);

    const result = await service.updateProfile(7, {
      nickname: '削球手',
      city: '南阳',
      style: '削球',
      level: 2,
    } as any);

    expect(repo.update).toHaveBeenCalledWith(7, {
      nickname: '削球手',
      city: '南阳',
      style: '削球',
      level: 2,
    });
    expect(result).toEqual(expect.objectContaining({
      id: 7,
      nickname: '球友',
      city: '南阳',
      style: '削球',
      levelValue: 2,
      role: 'user',
      status: 'active',
      checkinCount: 3,
      favoriteCount: 2,
    }));
  });

  it('returns persisted notification and privacy preferences', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({ ...user, remindMatch: false, remindSignIn: true, showActivity: false }),
    };
    const checkinRepo = { count: jest.fn().mockResolvedValue(0) };
    const favoriteRepo = { count: jest.fn().mockResolvedValue(0) };
    const service = new UserService(repo as any, checkinRepo as any, favoriteRepo as any);

    const result = await service.getProfile(7);

    expect(result.preferences).toEqual({
      remindMatch: false,
      remindSignIn: true,
      showActivity: false,
    });
  });
});


