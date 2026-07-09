import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require **all** of the given granular permissions (`resource:action`).
 * Enforced by the global `PermissionsGuard`. Example:
 * `@RequirePermissions('users:delete')`.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
