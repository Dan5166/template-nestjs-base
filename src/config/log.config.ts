import { registerAs } from '@nestjs/config';

export interface LogConfig {
  level: string;
  pretty: boolean;
}

export default registerAs<LogConfig>('log', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
  pretty: process.env.LOG_PRETTY === 'true',
}));
