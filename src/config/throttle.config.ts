import { registerAs } from '@nestjs/config';

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export default registerAs<ThrottleConfig>('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
}));
