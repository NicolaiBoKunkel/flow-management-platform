import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FlowStatus, FlowVisibility } from './create-flow.dto';

export class UpdateFlowDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(FlowVisibility)
  @IsOptional()
  visibility?: FlowVisibility;

  @IsEnum(FlowStatus)
  @IsOptional()
  status?: FlowStatus;

  @IsObject()
  @IsOptional()
  graph?: {
    nodes: {
      id: string;
      type: 'start' | 'question' | 'end' | 'info';
      label: string;
      position: {
        x: number;
        y: number;
      };
      questionType?: 'singleChoice' | 'number' | 'text';
      introText?: string;
      questionText?: string;
      resultText?: string;
      infoText?: string;
    }[];
    edges: {
      id: string;
      source: string;
      target: string;
      label?: string;
    }[];
  };
}