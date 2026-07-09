import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password: string;
}

export default registerAs<RedisConfig>('redis', () => ({
  enabled: process.env.REDIS_ENABLED === 'true',
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD ?? '',
}));
