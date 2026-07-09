import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenBusinessException } from '../exceptions/business.exception';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { RolesGuard } from './roles.guard';

const contextWithUser = (user?: Partial<AuthenticatedUser>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

const reflectorReturning = (value: string[] | undefined): Reflector =>
  ({ getAllAndOverride: () => value }) as unknown as Reflector;

describe('RolesGuard', () => {
  it('allows when no @Roles metadata is present', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    expect(guard.canActivate(contextWithUser())).toBe(true);
  });

  it('allows when the user has one of the required roles', () => {
    const guard = new RolesGuard(reflectorReturning(['admin']));
    const ctx = contextWithUser({ roles: ['user', 'admin'], permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when the user lacks the required role', () => {
    const guard = new RolesGuard(reflectorReturning(['admin']));
    const ctx = contextWithUser({ roles: ['user'], permissions: [] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenBusinessException);
  });

  it('denies when there is no authenticated user', () => {
    const guard = new RolesGuard(reflectorReturning(['admin']));
    expect(() => guard.canActivate(contextWithUser())).toThrow(ForbiddenBusinessException);
  });
});
