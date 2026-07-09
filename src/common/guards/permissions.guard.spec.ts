import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenBusinessException } from '../exceptions/business.exception';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PermissionsGuard } from './permissions.guard';

const contextWithUser = (user?: Partial<AuthenticatedUser>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

const reflectorReturning = (value: string[] | undefined): Reflector =>
  ({ getAllAndOverride: () => value }) as unknown as Reflector;

describe('PermissionsGuard', () => {
  it('allows when no @RequirePermissions metadata is present', () => {
    const guard = new PermissionsGuard(reflectorReturning(undefined));
    expect(guard.canActivate(contextWithUser())).toBe(true);
  });

  it('allows when the user holds all required permissions', () => {
    const guard = new PermissionsGuard(reflectorReturning(['users:read', 'users:create']));
    const ctx = contextWithUser({
      roles: [],
      permissions: ['users:read', 'users:create', 'users:delete'],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when the user is missing any required permission', () => {
    const guard = new PermissionsGuard(reflectorReturning(['users:read', 'users:delete']));
    const ctx = contextWithUser({ roles: [], permissions: ['users:read'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenBusinessException);
  });
});
