import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RevokedToken } from './entities/revoked-token.entity';
import { TokenBlacklistService } from './token-blacklist.service';

/** Database-backed token blacklist (Postgres). */
@Injectable()
export class DbTokenBlacklistService extends TokenBlacklistService {
  constructor(
    @InjectRepository(RevokedToken)
    private readonly repo: Repository<RevokedToken>,
  ) {
    super();
  }

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    await this.repo.upsert({ jti, expiresAt }, ['jti']);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const token = await this.repo.findOne({ where: { jti } });
    if (!token) return false;
    // Lazy prune: an expired revocation no longer matters (the JWT is dead anyway).
    if (token.expiresAt.getTime() < Date.now()) {
      await this.repo.delete({ jti });
      return false;
    }
    return true;
  }

  /** Purge all expired revocations. Wire to a cron if desired. */
  async purgeExpired(): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
