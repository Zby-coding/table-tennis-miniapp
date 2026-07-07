import { IsLatitude, IsLongitude, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbyPlayersDto {
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
  @Max(100000)
  radius?: number;
}
