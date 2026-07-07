import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/checkin')
export class CheckinController {
  constructor(private checkinService: CheckinService) {}

  @Post('in')
  async checkin(
    @CurrentUser('sub') userId: number,
    @Body() body: { courtId: number; lat: number; lng: number },
  ) {
    return this.checkinService.checkin(userId, body.courtId, body.lat, body.lng);
  }

  @Post('out')
  async checkout(@CurrentUser('sub') userId: number) {
    return this.checkinService.checkout(userId);
  }

  @Get('status')
  async status(@CurrentUser('sub') userId: number) {
    return this.checkinService.getUserStatus(userId);
  }

  @Public()
  @Get('court/:courtId')
  async courtActive(@Param('courtId') courtId: string) {
    return this.checkinService.getActiveCount(parseInt(courtId));
  }
}
