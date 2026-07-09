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
