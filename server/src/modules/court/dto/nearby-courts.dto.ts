import { IsLatitude, IsLongitude, IsOptional, IsInt, IsBooleanString, Min, Max } from 'class-validator';
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
  @Max(150000)
  radius?: number;

  @IsOptional()
  @IsBooleanString()
  isFree?: string;

  @IsOptional()
  @IsBooleanString()
  isIndoor?: string;

  @IsOptional()
  @IsBooleanString()
  hasLighting?: string;

  @IsOptional()
  keyword?: string;
}

