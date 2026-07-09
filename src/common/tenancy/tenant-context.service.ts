import { Injectable } from '@nestjs/common';
import { tenantStorage } from './tenant-context';

/**
 * Read/write the active tenant from anywhere (services, repositories, subscribers)
 * without threading it through method arguments.
 *
 * Returns `null` when multi-tenancy is disabled or no tenant was resolved.
 */
@Injectable()
export class TenantContextService {
  /** The current tenant id, or `null`. */
  getTenantId(): string | null {
    return tenantStorage.getStore()?.tenantId ?? null;
  }

  /** True when a tenant is active on the current request. */
  hasTenant(): boolean {
    return this.getTenantId() !== null;
  }

  /** Overwrite the tenant for the current async context (rarely needed). */
  setTenantId(tenantId: string | null): void {
    const store = tenantStorage.getStore();
    if (store) store.tenantId = tenantId;
  }
}
