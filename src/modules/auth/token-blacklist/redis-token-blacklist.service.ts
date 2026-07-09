import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../shared/redis/redis.constants';
import { TokenBlacklistService } from './token-blacklist.service';

const KEY_PREFIX = 'bl:jti:';

/**
 * Redis-backed token blacklist. Uses native key TTL so revoked entries expire
 * exactly when the JWT would have — no manual cleanup needed.
 */
@Injectable()
export class RedisTokenBlacklistService extends TokenBlacklistService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    const ttlSeconds = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
    // Already expired → nothing to store (the JWT is dead anyway).
    if (ttlSeconds <= 0) return;
    await this.redis.set(`${KEY_PREFIX}${jti}`, '1', 'EX', ttlSeconds);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`${KEY_PREFIX}${jti}`);
    return exists === 1;
  }
}
