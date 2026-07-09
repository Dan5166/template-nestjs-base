import appConfig, { AppConfig } from './app.config';
import databaseConfig, { DatabaseConfig } from './database.config';
import jwtConfig, { JwtConfig } from './jwt.config';
import throttleConfig, { ThrottleConfig } from './throttle.config';
import redisConfig, { RedisConfig } from './redis.config';
import oauthConfig, { OAuthConfig } from './oauth.config';
import logConfig, { LogConfig } from './log.config';
import seedConfig, { SeedConfig } from './seed.config';

/**
 * All config factories to register with ConfigModule.forRoot({ load: configurations }).
 */
export const configurations = [
  appConfig,
  databaseConfig,
  jwtConfig,
  throttleConfig,
  redisConfig,
  oauthConfig,
  logConfig,
  seedConfig,
];

/**
 * Strongly-typed shape of the whole config tree.
 * Use with ConfigService<AppConfigTree, true> for typed, inferred `get()` calls.
 */
export interface AppConfigTree {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  throttle: ThrottleConfig;
  redis: RedisConfig;
  oauth: OAuthConfig;
  log: LogConfig;
  seed: SeedConfig;
}

export {
  appConfig,
  databaseConfig,
  jwtConfig,
  throttleConfig,
  redisConfig,
  oauthConfig,
  logConfig,
  seedConfig,
};

export type {
  AppConfig,
  DatabaseConfig,
  JwtConfig,
  ThrottleConfig,
  RedisConfig,
  OAuthConfig,
  LogConfig,
  SeedConfig,
};
