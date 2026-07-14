import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

interface WxLoginResult {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async wxLogin(code: string, nickname?: string, avatarUrl?: string) {
    const wxData = await this.code2Session(code);
    const openid = wxData?.openid;

    if (!openid) {
      throw new UnauthorizedException('微信登录失败，请重试');
    }

    let user = await this.userRepo.findOne({ where: { openid } });
    const isDevAdmin = this.isDevAdminLogin(code, openid);

    if (!user) {
      user = this.userRepo.create({
        openid,
        nickname: nickname || (isDevAdmin ? '管理员' : `球友${Date.now().toString(36).slice(-4)}`),
        avatarUrl,
        role: isDevAdmin ? UserRole.ADMIN : UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(user);
    } else {
      if (nickname) user.nickname = nickname;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      if (isDevAdmin && user.role !== UserRole.ADMIN) user.role = UserRole.ADMIN;
      if (isDevAdmin && user.status !== UserStatus.ACTIVE) user.status = UserStatus.ACTIVE;
      await this.userRepo.save(user);
    }

    const token = this.jwtService.sign({ sub: user.id, openid });
    return { token, user: this.sanitizeUser(user) };
  }
  private async code2Session(code: string): Promise<WxLoginResult | null> {
    const appId = this.configService.get<string>('WECHAT_APP_ID');
    const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');
    const devMode = this.configService.get<string>('ENABLE_DEV_AUTH', 'false') === 'true';

    // Only bypass in explicitly enabled dev mode, and only in development environment
    if (devMode && this.configService.get<string>('NODE_ENV') === 'development') {
      // Require explicit opt-in, never use hardcoded sentinel
      this.logger.warn('[DEV MODE] WeChat authentication bypassed — use only in development');
      return { openid: `dev_${code}`, session_key: 'dev_session' };
    }

    if (!appId || !appSecret) {
      throw new UnauthorizedException('WeChat 配置缺失，请联系管理员');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`,
        { signal: controller.signal },
      );
      const data: WxLoginResult = await res.json();

      if (data.errcode) {
        this.logger.error(`WeChat code2session failed: ${data.errcode} ${data.errmsg}`);
        throw new UnauthorizedException('微信登录失败，请重试');
      }
      return data;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error('WeChat code2session network error', err);
      throw new UnauthorizedException('微信服务暂时不可用，请稍后重试');
    } finally {
      clearTimeout(timeout);
    }
  }

  private isDevAdminLogin(code: string, openid: string) {
    const devMode = this.configService.get<string>('ENABLE_DEV_AUTH', 'false') === 'true';
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const adminCode = (this.configService.get<string>('DEV_ADMIN_CODE') || '').trim();
    if (!devMode || !isDevelopment || !adminCode) return false;
    return code === adminCode && openid === `dev_${adminCode}`;
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  sanitizeUser(user: User) {
    // Use whitelist approach — only expose fields safe for clients
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      level: user.level,
      style: user.style,
      city: user.city,
      totalHours: user.totalHours,
      totalMatches: user.totalMatches,
      wins: user.wins,
      points: user.points,
      checkinStreak: user.checkinStreak,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
