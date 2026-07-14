import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  remindMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  remindSignIn?: boolean;

  @IsOptional()
  @IsBoolean()
  showActivity?: boolean;
}
