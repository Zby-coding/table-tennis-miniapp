import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsString()
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  courtId: number;

  @IsString()
  startTime: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(100)
  totalCapacity: number;

  @IsString()
  feeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  feeValue: number;

  @IsOptional()
  @IsString()
  description?: string;
}
