import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UserModule } from '../user/user.module';
import { CheckinModule } from '../checkin/checkin.module';
import { CourtModule } from '../court/court.module';
import { AchievementModule } from '../achievement/achievement.module';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { AdminOpsController } from './admin-ops.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UserModule,
    CheckinModule,
    CourtModule,
    AchievementModule,
  ],
  controllers: [AdminUserController, AdminOpsController],
  providers: [AdminUserService, AdminGuard],
})
export class AdminUserModule {}
