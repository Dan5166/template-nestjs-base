import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigTree } from '../../../config';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  ErrorCode,
  UnauthorizedBusinessException,
} from '../../../common/exceptions/business.exception';
import { UsersService } from '../../users/users.service';
import { extractAuthz } from '../../authorization/authorization.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenBlacklistService } from '../token-blacklist/token-blacklist.service';

/** Validates the access token on protected routes. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<AppConfigTree, true>,
    private readonly blacklist: TokenBlacklistService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    if (await this.blacklist.isRevoked(payload.jti)) {
      throw new UnauthorizedBusinessException('Token has been revoked', ErrorCode.TOKEN_REVOKED);
    }

    const user = await this.usersService.findByEmailWithRoles(payload.email);
    if (!user || user.id !== payload.sub || !user.isActive) {
      throw new UnauthorizedBusinessException('User is no longer valid', ErrorCode.TOKEN_INVALID);
    }

    const { roles, permissions } = extractAuthz(user);
    return {
      id: user.id,
      email: user.email,
      roles,
      permissions,
      jti: payload.jti,
      sid: payload.sid,
      tokenExp: payload.exp,
    };
  }
}
