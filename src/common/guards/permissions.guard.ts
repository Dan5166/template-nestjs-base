import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ForbiddenBusinessException } from '../exceptions/business.exception';

/**
 * Global guard enforcing `@RequirePermissions()` — the user must hold **all**
 * listed permissions. No metadata → allow. Runs after JwtAuthGuard.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const has = !!user && required.every((perm) => user.permissions.includes(perm));
    if (!has) {
      throw new ForbiddenBusinessException(`Requires permission: ${required.join(', ')}`);
    }
    return true;
  }
}
