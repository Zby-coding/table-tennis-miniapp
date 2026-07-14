import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CheckinDto } from './dto/checkin.dto';

@Controller('api/checkin')
export class CheckinController {
  constructor(private checkinService: CheckinService) {}

  @Post('in')
  async checkin(
    @CurrentUser('sub') userId: number,
    @Body() body: CheckinDto,
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

  @Get('history')
  async history(
    @CurrentUser('sub') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.checkinService.getHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Public()
  @Get('court/:courtId')
  async courtActive(@Param('courtId') courtId: string) {
    return this.checkinService.getActiveCount(parseInt(courtId, 10), { includePlayers: false });
  }

  @Get('court/:courtId/players')
  async courtPlayers(@Param('courtId') courtId: string) {
    return this.checkinService.getActiveCount(parseInt(courtId, 10), { includePlayers: true });
  }
}
