import { IsString, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courtId?: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(100)
  totalCapacity?: number;

  @IsOptional()
  @IsString()
  feeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  feeValue?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requireApproval?: boolean;
}
