import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Court } from '../../entities/court.entity';
import { CourtReview } from '../../entities/court-review.entity';
import { Favorite } from '../../entities/favorite.entity';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Court, CourtReview, Favorite])],
  providers: [CourtService],
  controllers: [CourtController],
  exports: [CourtService],
})
export class CourtModule {}
