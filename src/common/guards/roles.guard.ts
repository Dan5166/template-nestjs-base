import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ForbiddenBusinessException } from '../exceptions/business.exception';

/**
 * Global guard enforcing `@Roles()`. No metadata → allow (guard is a no-op unless
 * a route/controller opts in). Runs after JwtAuthGuard, so `request.user` is set.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const has = !!user && required.some((role) => user.roles.includes(role));
    if (!has) {
      throw new ForbiddenBusinessException(`Requires role: ${required.join(' or ')}`);
    }
    return true;
  }
}
