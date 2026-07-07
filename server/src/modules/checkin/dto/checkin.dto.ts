import { IsInt, IsLatitude, IsLongitude, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckinDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courtId: number;

  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;
}
