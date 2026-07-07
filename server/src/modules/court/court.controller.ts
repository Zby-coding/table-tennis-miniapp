import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { CourtService } from './court.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/courts')
export class CourtController {
  constructor(private courtService: CourtService) {}

  @Get('nearby')
  async nearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('isFree') isFree?: string,
    @Query('isIndoor') isIndoor?: string,
    @Query('hasLighting') hasLighting?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.courtService.findNearby(
      parseFloat(lat || '0'),
      parseFloat(lng || '0'),
      radius ? parseInt(radius) : 5000,
      {
        isFree: isFree !== undefined ? isFree === 'true' : undefined,
        isIndoor: isIndoor !== undefined ? isIndoor === 'true' : undefined,
        hasLighting: hasLighting !== undefined ? hasLighting === 'true' : undefined,
        keyword,
      },
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.courtService.getDetail(parseInt(id));
  }

  @Post(':id/review')
  async review(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() body: { rating: number; content: string; images?: string[] },
  ) {
    return this.courtService.review(userId, parseInt(id), body.rating, body.content, body.images);
  }

  @Post(':id/favorite')
  async toggleFavorite(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.courtService.toggleFavorite(userId, parseInt(id));
  }

  @Get('user/favorites')
  async getFavorites(@CurrentUser('sub') userId: number) {
    return this.courtService.getFavorites(userId);
  }

  @Post('custom')
  async createCustom(
    @CurrentUser('sub') userId: number,
    @Body() body: { name: string; lat: number; lng: number; isFree?: boolean; tableCount?: number },
  ) {
    return this.courtService.create({ ...body, userId });
  }
}
