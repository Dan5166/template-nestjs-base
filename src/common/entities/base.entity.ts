import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Abstract base for every persisted entity.
 *
 * Provides:
 *  - `id`         UUID primary key
 *  - `createdAt`  set on insert
 *  - `updatedAt`  bumped on every update
 *  - `deletedAt`  soft-delete marker (populated by `repository.softDelete()`)
 *  - `version`    optimistic-locking counter
 *
 * Extend it in feature entities: `export class User extends BaseEntity { ... }`.
 */
export abstract class BaseEntity {
  @ApiProperty({ format: 'uuid', example: '3f1a6c2e-9b7d-4d3a-8c2b-9a1e5f0b7c11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /** Null while the row is active; set to a timestamp when soft-deleted. */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  @Exclude()
  deletedAt: Date | null;

  @Exclude()
  @VersionColumn()
  version: number;

  // --- Multi-tenancy hook (disabled by default) ---------------------------
  // The tenancy scaffolding (context, middleware, @Tenant()) is wired but off
  // while MULTI_TENANT=false. To make entities tenant-scoped, add a column here
  // (or on the specific entities that need it) and auto-scope your queries:
  //
  //   @Index()
  //   @Column({ type: 'uuid', nullable: true })
  //   tenantId: string | null;
  //
  // Then filter by `tenantContext.getTenantId()` in your services, or register a
  // TypeORM EntitySubscriber to set/enforce it automatically.
  // See USAGE.md → "Enabling multi-tenancy".
}
