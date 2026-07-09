import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Triggers the refresh strategy (refresh token from the httpOnly cookie). */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
