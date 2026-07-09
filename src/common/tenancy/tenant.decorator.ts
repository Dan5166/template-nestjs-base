import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { tenantStorage } from './tenant-context';

/**
 * Inject the current tenant id into a handler:
 *   `findAll(@Tenant() tenantId: string | null) { ... }`
 * Returns `null` when multi-tenancy is disabled or no tenant was resolved.
 */
export const Tenant = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string | null =>
    tenantStorage.getStore()?.tenantId ?? null,
);
