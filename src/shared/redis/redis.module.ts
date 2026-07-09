import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { AppConfigTree } from '../../config';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Provides a shared ioredis client under {@link REDIS_CLIENT}, or `null` when
 * `REDIS_ENABLED=false`. Consumers must handle the null case (see the token
 * blacklist factory, which falls back to the DB implementation).
 *
 * Global so any module can inject the client without re-importing.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfigTree, true>): Redis | null => {
        const redis = config.get('redis', { infer: true });
        if (!redis.enabled) return null;

        const logger = new Logger('Redis');
        const client = new Redis({
          host: redis.host,
          port: redis.port,
          password: redis.password || undefined,
          maxRetriesPerRequest: 3,
          lazyConnect: false,
        });
        client.on('connect', () => logger.log(`Connected to Redis at ${redis.host}:${redis.port}`));
        client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<Redis | null>(REDIS_CLIENT, { strict: false });
    if (client) {
      await client.quit();
    }
  }
}
