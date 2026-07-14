import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserRole, UserStatus } from '../../entities/user.entity';

describe('AuthService', () => {
  it('creates a development admin when logging in with DEV_ADMIN_CODE', async () => {
    const savedUsers: any[] = [];
    const repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ id: 9, ...data })),
      save: jest.fn(async (user) => {
        savedUsers.push(user);
        return user;
      }),
    };
    const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'ENABLE_DEV_AUTH') return 'true';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DEV_ADMIN_CODE') return 'admin';
        return fallback;
      }),
    } as unknown as ConfigService;
    const service = new AuthService(repo as any, jwt, config);

    const result = await service.wxLogin('admin');

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      openid: 'dev_admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    }));
    expect(savedUsers[0].role).toBe(UserRole.ADMIN);
    expect(result.user).toEqual(expect.objectContaining({ role: UserRole.ADMIN, status: UserStatus.ACTIVE }));
  });

  it('does not elevate admin when DEV_ADMIN_CODE is unset', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ id: 10, ...data })),
      save: jest.fn(async (user) => user),
    };
    const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'ENABLE_DEV_AUTH') return 'true';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DEV_ADMIN_CODE') return '';
        return fallback;
      }),
    } as unknown as ConfigService;
    const service = new AuthService(repo as any, jwt, config);

    const result = await service.wxLogin('admin');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      role: UserRole.USER,
    }));
    expect(result.user.role).toBe(UserRole.USER);
  });
});
