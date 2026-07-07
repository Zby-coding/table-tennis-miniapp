import { IsInt, IsString, IsOptional, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewCourtDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
