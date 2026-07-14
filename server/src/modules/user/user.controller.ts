import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

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
    @Body() body: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, body);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser('sub') userId: number,
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(userId, body);
  }
}
