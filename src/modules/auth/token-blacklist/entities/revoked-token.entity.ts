import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * A revoked JWT (by its `jti`). Rows past `expiresAt` are dead weight and can be
 * purged (the DB blacklist prunes lazily on lookup; a scheduled cleanup can be
 * added). Replaced by Redis with native TTL in Phase 10.
 */
@Entity('revoked_tokens')
export class RevokedToken {
  @PrimaryColumn({ type: 'uuid' })
  jti: string;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  revokedAt: Date;
}
