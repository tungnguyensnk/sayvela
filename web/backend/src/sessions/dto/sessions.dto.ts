import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class BulkInsertSegmentsDto {
  segments!: {
    id: string;
    speaker?: string;
    source?: string;
    text: string;
    startMs: number;
    endMs: number;
  }[];
}
