import { Controller, Get, Inject, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';
import { RawResponse } from '../../common/decorators/raw-response.decorator';
import { REDIS_CLIENT } from '../../shared/redis/redis.constants';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Liveness/readiness endpoint at `/api/health` (version-neutral, public).
 * Returns Terminus's native shape (via `@RawResponse()`), so probes and
 * uptime monitors can parse it directly.
 */
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  @Public()
  @SkipThrottle()
  @RawResponse()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      // Only reported when Redis is enabled.
      ...(this.redis ? [() => this.pingRedis()] : []),
    ]);
  }

  private async pingRedis(): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis!.ping();
      return { redis: { status: pong === 'PONG' ? 'up' : 'down' } };
    } catch {
      return { redis: { status: 'down' } };
    }
  }
}
