import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '../entities/user.entity';

/**
 * Shape returned to clients. Sensitive columns (password, refreshTokenHash,
 * providerId, deletedAt, version) are omitted here and also `@Exclude()`d on the
 * entity, so responses are safe whether an entity or this DTO is serialized.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ nullable: true, example: 'Jane' })
  firstName: string | null;

  @ApiProperty({ nullable: true, example: 'Doe' })
  lastName: string | null;

  @ApiProperty({ default: true })
  isActive: boolean;

  @ApiProperty({ enum: AuthProvider })
  provider: AuthProvider;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
