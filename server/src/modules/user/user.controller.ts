import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser('sub') userId: number) {
    return this.userService.getProfile(userId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('sub') userId: number,
    @Body() body: { nickname?: string; avatarUrl?: string; style?: string; city?: string },
  ) {
    return this.userService.updateProfile(userId, body);
  }
}
