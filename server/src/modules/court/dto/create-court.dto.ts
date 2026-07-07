import { IsString, IsOptional, IsBoolean, IsInt, Min, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourtDto {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tableCount?: number;
}
