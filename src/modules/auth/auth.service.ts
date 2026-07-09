import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigTree } from '../../config';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  BusinessException,
  ErrorCode,
  UnauthorizedBusinessException,
} from '../../common/exceptions/business.exception';
import { HashingService } from '../../shared/hashing/hashing.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { parseDurationToMs } from './auth.constants';
import { RegisterDto } from './dto/register.dto';
import { OAuthProfile } from './interfaces/oauth-profile.interface';
import { IssuedTokens, JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenBlacklistService } from './token-blacklist/token-blacklist.service';

/** Role assigned to accounts created through self-registration. */
export const DEFAULT_ROLE = 'user';

export interface AuthResult {
  user: User;
  tokens: IssuedTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService<AppConfigTree, true>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly hashing: HashingService,
    private readonly blacklist: TokenBlacklistService,
    private readonly authorization: AuthorizationService,
  ) {}

  /** Verify email + password (used by the local strategy). */
  async validateUser(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByEmail(email, true);
    if (!user?.password || !(await this.hashing.verify(user.password, password))) {
      throw new UnauthorizedBusinessException('Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      throw new UnauthorizedBusinessException('Account is disabled');
    }
    return { id: user.id, email: user.email, roles: [], permissions: [] };
  }

  /** Self-registration: create the account and issue tokens. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create(dto);
    await this.authorization.assignRoles(user.id, [DEFAULT_ROLE]);
    const tokens = await this.issueTokens(user.id, user.email);
    return { user, tokens };
  }

  /** Issue tokens for an already-validated user (login). */
  async login(principal: AuthenticatedUser): Promise<AuthResult> {
    const tokens = await this.issueTokens(principal.id, principal.email);
    return { user: await this.usersService.findOne(principal.id), tokens };
  }

  /** Validate a refresh token against the stored hash (used by the refresh strategy). */
  async validateRefreshToken(payload: JwtPayload, token: string): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByEmail(payload.email, true);
    if (!user || user.id !== payload.sub || !user.refreshTokenHash) {
      throw new UnauthorizedBusinessException(
        'Refresh token not recognized',
        ErrorCode.TOKEN_INVALID,
      );
    }
    const matches = await this.hashing.verify(user.refreshTokenHash, token);
    if (!matches) {
      // The presented token doesn't match the last issued one → likely reuse.
      await this.usersService.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedBusinessException(
        'Refresh token reuse detected',
        ErrorCode.TOKEN_REVOKED,
      );
    }
    return {
      id: user.id,
      email: user.email,
      roles: [],
      permissions: [],
      jti: payload.jti,
      tokenExp: payload.exp,
    };
  }

  /**
   * Complete an OAuth sign-in: find by provider id, else link to an existing
   * email account, else create a new passwordless user. Then issue app tokens.
   */
  async handleOAuthLogin(profile: OAuthProfile): Promise<AuthResult> {
    if (!profile.email) {
      throw new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        'The OAuth provider did not return an email address',
        HttpStatus.BAD_REQUEST,
      );
    }

    let user = await this.usersService.findByProviderId(profile.provider, profile.providerId);
    if (!user) {
      const existing = await this.usersService.findByEmail(profile.email);
      if (existing) {
        await this.usersService.linkOAuthProvider(
          existing.id,
          profile.provider,
          profile.providerId,
        );
        user = existing;
      } else {
        user = await this.usersService.createOAuthUser({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          provider: profile.provider,
          providerId: profile.providerId,
        });
        await this.authorization.assignRoles(user.id, [DEFAULT_ROLE]);
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedBusinessException('Account is disabled');
    }
    const tokens = await this.issueTokens(user.id, user.email);
    return { user, tokens };
  }

  /** Rotate tokens (new access + new refresh, replacing the stored hash). */
  async refresh(principal: AuthenticatedUser): Promise<AuthResult> {
    const tokens = await this.issueTokens(principal.id, principal.email);
    return { user: await this.usersService.findOne(principal.id), tokens };
  }

  /** Revoke the current access token and invalidate the refresh token. */
  async logout(principal: AuthenticatedUser): Promise<void> {
    if (principal.jti && principal.tokenExp) {
      await this.blacklist.revoke(principal.jti, new Date(principal.tokenExp * 1000));
    }
    await this.usersService.setRefreshTokenHash(principal.id, null);
  }

  /** How long the refresh cookie should live (ms), derived from config. */
  get refreshCookieMaxAgeMs(): number {
    return parseDurationToMs(this.config.get('jwt', { infer: true }).refreshExpiresIn);
  }

  private async issueTokens(userId: string, email: string): Promise<IssuedTokens> {
    const jwt = this.config.get('jwt', { infer: true });
    const accessPayload: JwtPayload = { sub: userId, email, type: 'access', jti: uuidv4() };
    const refreshPayload: JwtPayload = { sub: userId, email, type: 'refresh', jti: uuidv4() };

    // `expiresIn` accepts strings like '15m' at runtime; the jsonwebtoken types
    // model it as a branded StringValue, hence the cast.
    const accessOptions: JwtSignOptions = {
      secret: jwt.accessSecret,
      expiresIn: jwt.accessExpiresIn as unknown as JwtSignOptions['expiresIn'],
    };
    const refreshOptions: JwtSignOptions = {
      secret: jwt.refreshSecret,
      expiresIn: jwt.refreshExpiresIn as unknown as JwtSignOptions['expiresIn'],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, accessOptions),
      this.jwtService.signAsync(refreshPayload, refreshOptions),
    ]);

    await this.usersService.setRefreshTokenHash(userId, await this.hashing.hash(refreshToken));
    return { accessToken, refreshToken };
  }
}
