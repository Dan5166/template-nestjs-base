import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { HashingService } from '../../../shared/hashing/hashing.service';
import { RefreshToken } from './entities/refresh-token.entity';

/**
 * Persists and validates refresh-token sessions (one row per device/login).
 * Each session is identified by the refresh JWT's `jti`.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken) private readonly repo: Repository<RefreshToken>,
    private readonly hashing: HashingService,
  ) {}

  /** Record a newly issued refresh token as an active session. */
  async issue(userId: string, jti: string, token: string, expiresAt: Date): Promise<void> {
    const tokenHash = await this.hashing.hash(token);
    await this.repo.insert({ userId, jti, tokenHash, expiresAt });
  }

  /** Find the active session for this user + token id, if any. */
  findActive(userId: string, jti: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { userId, jti } });
  }

  /** Whether the presented token matches the session's stored hash. */
  matches(session: RefreshToken, token: string): Promise<boolean> {
    return this.hashing.verify(session.tokenHash, token);
  }

  /** Revoke a single session (logout / rotation of the old token). */
  async revoke(jti: string): Promise<void> {
    await this.repo.delete({ jti });
  }

  /** Revoke every session for a user (reuse detected / global logout). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  /** Housekeeping: drop this user's expired sessions. */
  async pruneExpired(userId: string): Promise<void> {
    await this.repo.delete({ userId, expiresAt: LessThan(new Date()) });
  }
}
