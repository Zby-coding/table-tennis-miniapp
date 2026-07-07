import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../../entities/checkin.entity';
import { User } from '../../entities/user.entity';
import { Court } from '../../entities/court.entity';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { CheckinGateway } from './checkin.gateway';
import { AchievementModule } from '../achievement/achievement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckIn, User, Court]),
    AchievementModule,
  ],
  providers: [CheckinService, CheckinGateway],
  controllers: [CheckinController],
  exports: [CheckinService],
})
export class CheckinModule {}
