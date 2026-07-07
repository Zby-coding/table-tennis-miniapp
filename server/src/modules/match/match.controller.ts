import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { MatchService } from './match.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/matches')
export class MatchController {
  constructor(private matchService: MatchService) {}

  @Get('records')
  async getRecords(@CurrentUser('sub') userId: number) {
    return this.matchService.getRecords(userId);
  }

  @Post('records')
  async addRecord(
    @Body() body: {
      loserId: number;
      winnerScore: number;
      loserScore: number;
      locationName?: string;
      courtId?: number;
    },
    @CurrentUser('sub') winnerId: number,
  ) {
    return this.matchService.addRecord({
      winnerId,
      loserId: body.loserId,
      winnerScore: body.winnerScore,
      loserScore: body.loserScore,
      locationName: body.locationName,
      courtId: body.courtId,
      playedAt: new Date(),
    });
  }

  @Get('nearby-players')
  async nearbyPlayers(
    @CurrentUser('sub') userId: number,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.matchService.findNearbyPlayers(
      userId,
      parseFloat(lat || '0'),
      parseFloat(lng || '0'),
      radius ? parseInt(radius) : 10000,
    );
  }
}
