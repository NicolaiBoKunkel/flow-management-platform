import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum FlowVisibility {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public',
}

export enum FlowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class CreateFlowDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FlowVisibility)
  visibility!: FlowVisibility;

  @IsEnum(FlowStatus)
  status!: FlowStatus;
}