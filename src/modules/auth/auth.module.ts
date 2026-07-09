import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '@nestjs/common';
import { AppConfigTree } from '../../config';
import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../shared/redis/redis.constants';
import { RevokedToken } from './token-blacklist/entities/revoked-token.entity';
import { DbTokenBlacklistService } from './token-blacklist/db-token-blacklist.service';
import { RedisTokenBlacklistService } from './token-blacklist/redis-token-blacklist.service';
import { TokenBlacklistService } from './token-blacklist/token-blacklist.service';

/**
 * Register an OAuth strategy only when it's enabled AND configured — passport
 * throws if instantiated without a clientID, so we skip it otherwise.
 */
const oauthStrategyProviders: Provider[] = [
  {
    provide: GoogleStrategy,
    useFactory: (config: ConfigService<AppConfigTree, true>) => {
      const oauth = config.get('oauth', { infer: true });
      return oauth.enabled && oauth.google.clientId ? new GoogleStrategy(config) : undefined;
    },
    inject: [ConfigService],
  },
  {
    provide: GithubStrategy,
    useFactory: (config: ConfigService<AppConfigTree, true>) => {
      const oauth = config.get('oauth', { infer: true });
      return oauth.enabled && oauth.github.clientId ? new GithubStrategy(config) : undefined;
    },
    inject: [ConfigService],
  },
];

@Module({
  imports: [
    UsersModule,
    AuthorizationModule,
    PassportModule,
    TypeOrmModule.forFeature([RevokedToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfigTree, true>) => {
        const jwt = config.get('jwt', { infer: true });
        return {
          secret: jwt.accessSecret,
          signOptions: { expiresIn: jwt.accessExpiresIn as unknown as number },
        };
      },
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    ...oauthStrategyProviders,
    DbTokenBlacklistService,
    // Use Redis (native TTL) when a client is available, else the DB blacklist.
    {
      provide: TokenBlacklistService,
      inject: [REDIS_CLIENT, DbTokenBlacklistService],
      useFactory: (redis: Redis | null, dbBlacklist: DbTokenBlacklistService) =>
        redis ? new RedisTokenBlacklistService(redis) : dbBlacklist,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
