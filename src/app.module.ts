import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppConfigTree, configurations } from './config';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HashingModule } from './shared/hashing/hashing.module';
import { RedisModule } from './shared/redis/redis.module';
import { AppLoggerModule } from './shared/logger/logger.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: configurations,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
      // `.env.<NODE_ENV>` overrides `.env` (earlier file wins per key).
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    AppLoggerModule,
    ObservabilityModule,
    TenancyModule,
    DatabaseModule,
    RedisModule,
    HashingModule,
    AuthorizationModule,
    UsersModule,
    AuthModule,
    HealthModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfigTree, true>) => {
        const throttle = config.get('throttle', { infer: true });
        return {
          throttlers: [{ ttl: throttle.ttl, limit: throttle.limit }],
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    // Global rate limiting for every route (bypassed per-route with @SkipThrottle()).
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT auth: every route needs a valid access token unless @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Authorization: enforce @Roles() then @RequirePermissions() (no-op without them).
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // Standardized error responses for every thrown exception.
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // --- Global interceptors form an onion; on the RESPONSE they unwind from the
    // LAST provider (innermost) outward. Order below is deliberate:
    //   1) Timeout      (outermost)
    //   2) Serializer   (applies @Exclude on entities)
    //   3) Transform    (innermost: sees the raw `Paginated` instance to flatten it,
    //                    before the serializer turns it into a plain object)
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new ClassSerializerInterceptor(reflector, { excludeExtraneousValues: false }),
      inject: [Reflector],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
