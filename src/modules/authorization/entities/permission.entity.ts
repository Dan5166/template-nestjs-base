import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * A granular permission in `resource:action` form (e.g. `users:read`).
 * `name` is the canonical identifier checked by the PermissionsGuard;
 * `resource`/`action` are kept for querying/grouping.
 */
@Entity('permissions')
@Unique(['resource', 'action'])
export class Permission extends BaseEntity {
  @ApiProperty({ example: 'users:read' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ example: 'users' })
  @Column({ type: 'varchar', length: 60 })
  resource: string;

  @ApiProperty({ example: 'read' })
  @Column({ type: 'varchar', length: 60 })
  action: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;
}
