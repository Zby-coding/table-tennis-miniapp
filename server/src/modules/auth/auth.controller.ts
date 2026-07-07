import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsOptional } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

class WxLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto.code, dto.nickname, dto.avatarUrl);
  }
}
