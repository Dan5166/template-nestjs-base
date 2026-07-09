import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

/**
 * Standalone DataSource used by the TypeORM CLI (migrations, schema tooling).
 * Nest does NOT use this file at runtime — see `database.module.ts`.
 *
 *   npm run migration:generate -- src/database/migrations/<Name>
 *   npm run migration:run
 *   npm run migration:revert
 */
loadEnv();

const toBool = (v: string | undefined): boolean => v === 'true';

export const AppDataSource = new DataSource(
  buildTypeOrmOptions(
    {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'template',
      // Migrations must never rely on synchronize.
      synchronize: false,
      logging: toBool(process.env.DB_LOGGING),
      ssl: toBool(process.env.DB_SSL),
    },
    true,
  ),
);
