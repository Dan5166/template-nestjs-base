import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Shape of the authenticated principal attached to `request.user`
 * by the JWT strategy (populated from Phase 5 onward).
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  /** Access-token id (jti) of the request's token — used to revoke on logout. */
  jti?: string;
  /** Session id (paired refresh token's jti) — used to revoke the refresh
   *  session on logout. Present on access-token principals. */
  sid?: string;
  /** Access-token expiry (epoch seconds) — the revocation TTL. */
  tokenExp?: number;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Inject the authenticated user (or one of its properties) into a handler:
 *   `@CurrentUser() user: AuthenticatedUser`
 *   `@CurrentUser('id') userId: string`
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
