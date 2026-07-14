import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../modules/user/user.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** Global JWT guard with database-backed account status enforcement. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('请先登录');

    try {
      const payload = this.jwtService.verify<{ sub: number; openid?: string }>(token);
      const user = await this.userService.findById(Number(payload.sub));
      if (user.status === 'disabled') throw new UnauthorizedException('账号已停用');
      await this.userService.touchLastActive(user.id);
      request.user = { ...payload, role: user.role, status: user.status, user };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn('JWT verify failed:', (err as Error).message);
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
  }

  private extractToken(request: any): string | null {
    const auth = request.headers.authorization;
    if (!auth) return null;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
