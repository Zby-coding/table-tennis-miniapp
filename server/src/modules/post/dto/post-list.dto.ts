import { IsString, IsOptional } from 'class-validator';

export class PostListDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
