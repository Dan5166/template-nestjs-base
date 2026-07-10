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

  // --- Multi-tenancy --------------------------------------------------------
  // To make a resource tenant-scoped, extend `TenantScopedEntity` (which adds a
  // `tenantId` column) instead of this class. The TenantSubscriber then stamps
  // the active tenant on insert and BaseCrudService filters reads/writes to it
  // automatically — no per-service wiring. All a no-op while MULTI_TENANT=false.
  // See USAGE.md → "Enabling multi-tenancy".
}
