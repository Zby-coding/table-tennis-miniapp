import { IsLatitude, IsLongitude, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbyCourtsDto {
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50000)
  radius?: number;

  @IsOptional()
  isFree?: string;

  @IsOptional()
  isIndoor?: string;

  @IsOptional()
  hasLighting?: string;

  @IsOptional()
  keyword?: string;
}
