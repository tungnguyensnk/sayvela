import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class UpdateSettingsDto {
  @IsObject()
  settingsJson: Record<string, unknown>;
}

export class PatchDefaultContextDto {
  @IsOptional()
  @IsUUID()
  defaultContextId?: string | null;
}
