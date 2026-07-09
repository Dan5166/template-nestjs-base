import { registerAs } from '@nestjs/config';

export interface AppConfig {
  env: string;
  name: string;
  port: number;
  globalPrefix: string;
  apiVersion: string;
  corsOrigins: string[] | boolean;
  multiTenant: boolean;
}

const parseCorsOrigins = (value?: string): string[] | boolean => {
  if (!value || value.trim() === '*') return true;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export default registerAs<AppConfig>('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'template',
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
  apiVersion: process.env.APP_API_VERSION ?? '1',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  multiTenant: process.env.MULTI_TENANT === 'true',
}));
