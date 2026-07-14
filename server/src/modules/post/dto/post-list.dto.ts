import { IsString, IsOptional, IsIn } from 'class-validator';

export class PostListDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['recruiting', 'full'])
  status?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  timeFilter?: string;
}
