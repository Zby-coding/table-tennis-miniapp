import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddRecordDto {
  @Type(() => Number)
  @IsInt()
  loserId: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  winnerScore: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  loserScore: number;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courtId?: number;
}
