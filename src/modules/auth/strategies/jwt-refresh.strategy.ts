import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AppConfigTree } from '../../../config';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedBusinessException } from '../../../common/exceptions/business.exception';
import { AuthService } from '../auth.service';
import { REFRESH_TOKEN_COOKIE } from '../auth.constants';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const cookieExtractor = (req: Request): string | null => {
  // cookie-parser augments req.cookies as `any`; narrow it explicitly.
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  return cookies[REFRESH_TOKEN_COOKIE] ?? null;
};

/** Validates the refresh token (from the httpOnly cookie) on /auth/refresh. */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService<AppConfigTree, true>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).refreshSecret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const token = cookieExtractor(req);
    if (!token || payload.type !== 'refresh') {
      throw new UnauthorizedBusinessException('Invalid refresh token');
    }
    return this.authService.validateRefreshToken(payload, token);
  }
}
