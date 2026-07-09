import { registerAs } from '@nestjs/config';

export interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
}

export default registerAs<SeedConfig>('seed', () => ({
  adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@template.local',
  adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
}));
