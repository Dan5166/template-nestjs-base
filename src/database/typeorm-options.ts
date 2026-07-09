import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './strategies/snake-naming.strategy';

export interface TypeOrmConnectionParams {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
}

/**
 * Single source of truth for the TypeORM connection.
 * Shared between the Nest runtime module and the standalone CLI data-source so
 * migrations and the running app never drift apart.
 *
 * `usingTsPaths` = true for the ts-node CLI (glob over `.ts` sources),
 * false for the compiled/Nest runtime (which uses `autoLoadEntities`).
 */
export const buildTypeOrmOptions = (
  cfg: TypeOrmConnectionParams,
  usingTsPaths = false,
): DataSourceOptions => {
  const ext = usingTsPaths ? 'ts' : 'js';
  const root = usingTsPaths ? 'src' : 'dist';

  return {
    type: 'postgres',
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password,
    database: cfg.database,
    synchronize: cfg.synchronize,
    logging: cfg.logging,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [`${root}/**/*.entity.${ext}`],
    migrations: [`${root}/database/migrations/*.${ext}`],
    migrationsTableName: 'migrations',
    migrationsRun: false,
  };
};
