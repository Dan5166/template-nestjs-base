import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One row per active refresh token (i.e. per login session / device). Replaces
 * the single `refreshTokenHash` column on the user, so a user can be signed in
 * on several devices at once and each session is revoked independently.
 *
 * The row is keyed by `jti` — the refresh JWT's id, which is also embedded in
 * the paired access token as the `sid` claim so logout can target this exact
 * session. Rotation deletes the old row and inserts a new one; presenting a
 * refresh token whose `jti` is no longer here signals replay of a used token.
 *
 * To surface a "devices" list, add `userAgent` / `ip` columns and populate them
 * from the request in AuthService.issueTokens().
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  /** The refresh token's jti; unique while the session is active. */
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  jti: string;

  /** Argon2 hash of the refresh token (never the raw token). */
  @Column({ type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
