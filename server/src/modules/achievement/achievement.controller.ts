import { Controller, Get } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/achievements')
export class AchievementController {
  constructor(private achievementService: AchievementService) {}

  @Get()
  async getMyAchievements(@CurrentUser('sub') userId: number) {
    return this.achievementService.getUserAchievements(userId);
  }
}
