import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// represents a soniox translation_terms entry
class TranslationTermDto {
  @IsString()
  source!: string;

  @IsString()
  target!: string;
}

// represents the soniox context_json shape
class ContextJsonDto {
  @IsOptional()
  @IsArray()
  general?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  terms?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationTermDto)
  translation_terms?: TranslationTermDto[];
}

export class CreateContextDto {
  @IsString()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ContextJsonDto)
  contextJson!: ContextJsonDto;
}

export class UpdateContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContextJsonDto)
  contextJson?: ContextJsonDto;
}
