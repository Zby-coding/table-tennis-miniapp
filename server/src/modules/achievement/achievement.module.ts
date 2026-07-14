import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAchievement } from '../../entities/user-achievement.entity';
import { User } from '../../entities/user.entity';
import { AchievementDef } from '../../entities/achievement-def.entity';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserAchievement, User, AchievementDef])],
  providers: [AchievementService],
  controllers: [AchievementController],
  exports: [AchievementService],
})
export class AchievementModule {}
