import { AsyncLocalStorage } from 'async_hooks';

/** Per-request store carried through async calls without prop-drilling. */
export interface TenantStore {
  tenantId: string | null;
}

/**
 * Request-scoped storage for the current tenant. Populated by
 * {@link TenantMiddleware} and read via {@link TenantContextService}.
 * Shared as a module-level singleton so any layer can reach the active tenant.
 */
export const tenantStorage = new AsyncLocalStorage<TenantStore>();

/**
 * Read the active tenant id without DI — for layers that can't easily inject
 * {@link TenantContextService} (the CRUD base service, the entity subscriber).
 * Returns `null` when multi-tenancy is off or no tenant was resolved.
 */
export const getTenantId = (): string | null => tenantStorage.getStore()?.tenantId ?? null;
