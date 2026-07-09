import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route/controller to users having **at least one** of the given roles.
 * Enforced by the global `RolesGuard`. Example: `@Roles('admin')`.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
