import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/**
 * All fields optional. When `permissions` is provided it **replaces** the role's
 * permission set; omit it to leave permissions untouched.
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
