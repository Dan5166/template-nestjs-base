import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor', description: 'Unique role name (used by @Roles()).' })
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'name must be lowercase letters, numbers, hyphens or underscores',
  })
  name: string;

  @ApiPropertyOptional({ example: 'Can manage content' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['users:read', 'users:update'],
    description: 'Permission names (resource:action) to grant to this role.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}
