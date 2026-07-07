import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchRecord } from '../../entities/match-record.entity';
import { User } from '../../entities/user.entity';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { AchievementModule } from '../achievement/achievement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchRecord, User]),
    AchievementModule,
  ],
  providers: [MatchService],
  controllers: [MatchController],
  exports: [MatchService],
})
export class MatchModule {}
