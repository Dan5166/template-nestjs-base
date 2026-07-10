import * as Joi from 'joi';

/**
 * Joi schema used by @nestjs/config to validate `process.env` at bootstrap.
 * If any required variable is missing or invalid the app fails fast on startup.
 */
export const envValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  APP_NAME: Joi.string().default('template'),
  APP_PORT: Joi.number().port().default(3000),
  APP_GLOBAL_PREFIX: Joi.string().default('api'),
  APP_API_VERSION: Joi.string().default('1'),
  CORS_ORIGINS: Joi.string().default('*'),
  // Max request body size accepted by the JSON/urlencoded parsers.
  APP_BODY_LIMIT: Joi.string().default('1mb'),
  // Force Swagger on in production (off there by default).
  SWAGGER_ENABLED: Joi.boolean().default(false),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Throttling
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Redis
  REDIS_ENABLED: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // OAuth
  OAUTH_ENABLED: Joi.boolean().default(false),
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_CALLBACK_URL: Joi.string().allow('').default(''),
  GITHUB_CLIENT_ID: Joi.string().allow('').default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').default(''),
  GITHUB_CALLBACK_URL: Joi.string().allow('').default(''),

  // Multi-tenancy
  MULTI_TENANT: Joi.boolean().default(false),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  LOG_PRETTY: Joi.boolean().default(true),

  // Seed
  SEED_ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .default('admin@template.local'),
  SEED_ADMIN_PASSWORD: Joi.string().default('Admin123!'),
});
