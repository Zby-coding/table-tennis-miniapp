import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { MatchService } from './match.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddRecordDto } from './dto/add-record.dto';
import { NearbyPlayersDto } from './dto/nearby-players.dto';

@Controller('api/matches')
export class MatchController {
  constructor(private matchService: MatchService) {}

  @Get('records')
  async getRecords(@CurrentUser('sub') userId: number) {
    return this.matchService.getRecords(userId);
  }

  @Post('records')
  async addRecord(
    @Body() body: AddRecordDto,
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
    @Query() dto: NearbyPlayersDto,
  ) {
    return this.matchService.findNearbyPlayers(
      userId,
      dto.lat,
      dto.lng,
      dto.radius ?? 10000,
    );
  }
}
