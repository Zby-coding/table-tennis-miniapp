import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const context = (user?: { sub?: number }) => ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as ExecutionContext;

  it('rejects missing authentication', async () => {
    const guard = new AdminGuard({ findById: jest.fn() } as any);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a normal user and allows an active admin', async () => {
    const findById = jest.fn()
      .mockResolvedValueOnce({ id: 7, role: 'user', status: 'active' })
      .mockResolvedValueOnce({ id: 8, role: 'admin', status: 'active' });
    const guard = new AdminGuard({ findById } as any);

    await expect(guard.canActivate(context({ sub: 7 }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(context({ sub: 8 }))).resolves.toBe(true);
  });
});
