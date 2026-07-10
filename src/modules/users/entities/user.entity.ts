import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../authorization/entities/role.entity';

/** How a user account was created / authenticates. */
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
}

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({ example: 'jane@example.com' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /** Argon2 hash. Never serialized. Nullable for OAuth-only accounts (Phase 7). */
  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @ApiProperty({ default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ enum: AuthProvider, default: AuthProvider.LOCAL })
  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  /** External id from an OAuth provider (Phase 7). */
  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  providerId: string | null;

  // Refresh tokens live in their own `refresh_tokens` table (one row per
  // session/device) — see RefreshTokenService — not as a column here.

  // User owns the join table (unidirectional): assign roles from the user side.
  // Not eager — only loaded when explicitly requested (e.g. building the JWT principal).
  @ManyToMany(() => Role)
  @JoinTable({ name: 'user_roles' })
  roles?: Role[];

  get fullName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  }
}
