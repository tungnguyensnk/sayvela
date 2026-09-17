import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(20_000)
  content!: string;
}

export class ChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  @Matches(/^data:image\/jpeg;base64,/)
  image?: string;
}

export class GateDto {
  @IsString()
  @MaxLength(8_000)
  transcript!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  context?: string;
}

export class OpenFrameDto {
  @IsIn(['qa', 'guide', 'code'])
  kind!: 'qa' | 'guide' | 'code';

  @IsInt()
  @Min(0)
  @Max(1)
  slot!: number;

  @IsInt()
  @Min(0)
  cardCount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  latestTitle?: string;
}

export class AssistDto {
  @IsString()
  @MaxLength(8_000)
  transcript!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  @Matches(/^data:image\/jpeg;base64,/)
  image?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @IsString()
  @MaxLength(8)
  language!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  speakLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  context?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => OpenFrameDto)
  openFrames?: OpenFrameDto[];

  @IsOptional()
  @IsBoolean()
  manual?: boolean;
}
