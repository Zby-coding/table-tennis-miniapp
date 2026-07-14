import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { AdminOnly } from '../../common/decorators/admin.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckinService } from '../checkin/checkin.service';
import { CourtService } from '../court/court.service';
import { AchievementService } from '../achievement/achievement.service';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AchievementRuleType } from '../../entities/achievement-def.entity';

class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() userId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courtId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
  @IsOptional() @IsString() status?: string;
}

class UpsertAchievementDto {
  @IsOptional() @IsString() key?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() desc?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() iconUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() points?: number;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() ruleType?: AchievementRuleType;
  @IsOptional() @Type(() => Number) @IsInt() ruleValue?: number;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class ToggleEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

class RejectBackgroundDto {
  @IsOptional() @IsString() @MaxLength(256) reason?: string;
}

@Controller('api/admin')
@AdminOnly()
export class AdminOpsController {
  constructor(
    private checkinService: CheckinService,
    private courtService: CourtService,
    private achievementService: AchievementService,
  ) {}

  @Get('checkins')
  listCheckins(@Query() query: ListQueryDto) {
    return this.checkinService.adminList(query);
  }

  @Get('favorites')
  listFavorites(@Query() query: ListQueryDto) {
    return this.courtService.adminListFavorites(query);
  }

  @Get('achievements')
  listAchievements() {
    return this.achievementService.listDefs(true);
  }

  @Post('achievements')
  createAchievement(@Body() body: UpsertAchievementDto) {
    return this.achievementService.createDef(body as any);
  }

  @Patch('achievements/:id')
  updateAchievement(@Param('id') id: string, @Body() body: UpsertAchievementDto) {
    return this.achievementService.updateDef(parseInt(id, 10), body as any);
  }

  @Patch('achievements/:id/enabled')
  setAchievementEnabled(@Param('id') id: string, @Body() body: ToggleEnabledDto) {
    return this.achievementService.setEnabled(parseInt(id, 10), body.enabled);
  }

  @Get('court-backgrounds')
  listBackgrounds(@Query() query: ListQueryDto) {
    return this.courtService.adminListBackgrounds({
      status: (query.status as any) || '',
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Post('court-backgrounds/:id/approve')
  approveBackground(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: number,
  ) {
    return this.courtService.approveBackground(parseInt(id, 10), adminId);
  }

  @Post('court-backgrounds/:id/reject')
  rejectBackground(
    @Param('id') id: string,
    @CurrentUser('sub') adminId: number,
    @Body() body: RejectBackgroundDto,
  ) {
    return this.courtService.rejectBackground(parseInt(id, 10), adminId, body.reason);
  }
}
