import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { CourtService } from './court.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NearbyCourtsDto } from './dto/nearby-courts.dto';
import { ReviewCourtDto } from './dto/review-court.dto';
import { CreateCourtDto } from './dto/create-court.dto';
import { IsString, IsNotEmpty } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';

class SubmitBackgroundDto {
  @IsString()
  @IsNotEmpty()
  url: string;
}

@Controller('api/courts')
export class CourtController {
  constructor(private courtService: CourtService) {}

  @Public()
  @Get('nearby')
  async nearby(@Query() dto: NearbyCourtsDto) {
    return this.courtService.findNearby(
      dto.lat,
      dto.lng,
      dto.radius ?? 5000,
      {
        isFree: dto.isFree !== undefined ? dto.isFree === 'true' : undefined,
        isIndoor: dto.isIndoor !== undefined ? dto.isIndoor === 'true' : undefined,
        hasLighting: dto.hasLighting !== undefined ? dto.hasLighting === 'true' : undefined,
        keyword: dto.keyword,
      },
    );
  }

  /** Must be before :id to avoid being captured as id=user */
  @Get('user/favorites')
  async getFavorites(@CurrentUser('sub') userId: number) {
    return this.courtService.getFavorites(userId);
  }

  @Post('custom')
  async createCustom(
    @CurrentUser('sub') userId: number,
    @Body() body: CreateCourtDto,
  ) {
    return this.courtService.create({ ...body, userId });
  }

  @Get(':id/background-eligibility')
  async backgroundEligibility(@Param('id') id: string) {
    return this.courtService.getBackgroundEligibility(parseInt(id, 10));
  }

  @Post(':id/backgrounds')
  async submitBackground(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() body: SubmitBackgroundDto,
  ) {
    return this.courtService.submitBackground(userId, parseInt(id, 10), body.url);
  }

  @Public()
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.courtService.getDetail(parseInt(id, 10));
  }

  @Post(':id/review')
  async review(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() body: ReviewCourtDto,
  ) {
    return this.courtService.review(userId, parseInt(id, 10), body.rating, body.content, body.images);
  }

  @Post(':id/favorite')
  async toggleFavorite(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.courtService.toggleFavorite(userId, parseInt(id, 10));
  }
}
