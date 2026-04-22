import { IsEmail, IsEnum } from 'class-validator';

export enum FlowAccessRoleDto {
  VIEWER = 'viewer',
  EDITOR = 'editor',
}

export class ShareFlowDto {
  @IsEmail()
  email!: string;

  @IsEnum(FlowAccessRoleDto)
  role!: FlowAccessRoleDto;
}
