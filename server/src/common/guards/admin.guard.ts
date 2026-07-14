import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const subject = Number(request.user?.sub);
    if (!subject) throw new UnauthorizedException('请先登录');

    const user = await this.userService.findById(subject);
    if (user.status !== 'active' || user.role !== 'admin') {
      throw new ForbiddenException('没有管理权限');
    }
    request.user = { ...request.user, role: user.role, status: user.status, user };
    return true;
  }
}
