import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** The canonical `name` is derived as `resource:action`. */
export class CreatePermissionDto {
  @ApiProperty({ example: 'products' })
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9_-]+$/, { message: 'resource must be lowercase (letters, numbers, - or _)' })
  resource: string;

  @ApiProperty({ example: 'read' })
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9_-]+$/, { message: 'action must be lowercase (letters, numbers, - or _)' })
  action: string;

  @ApiPropertyOptional({ example: 'Can read products' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
