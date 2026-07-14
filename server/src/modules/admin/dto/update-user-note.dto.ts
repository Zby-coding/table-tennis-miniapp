import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
