import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['横拍弧圈', '直拍快攻', '削球', '全能型', '初学'])
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  city?: string;
}
