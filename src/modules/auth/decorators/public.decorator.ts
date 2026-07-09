import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or a whole controller) as public, bypassing the global
 * {@link JwtAuthGuard}. Use for login/register/refresh, health checks, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
