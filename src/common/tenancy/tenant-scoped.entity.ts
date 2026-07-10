import { Column, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../entities/base.entity';

/**
 * Base for **tenant-scoped** entities. Extend this instead of {@link BaseEntity}
 * to opt a resource into data isolation: the `tenant_id` column is stamped on
 * insert and every read/update/delete through {@link BaseCrudService} is filtered
 * to the active tenant automatically (see {@link TenantSubscriber}).
 *
 * ```ts
 * @Entity('invoices')
 * export class Invoice extends TenantScopedEntity { ... }
 * ```
 *
 * Nullable so rows created outside a tenant context (e.g. seeds, or while
 * `MULTI_TENANT=false`) remain valid; scoping simply no-ops when no tenant is set.
 */
export abstract class TenantScopedEntity extends BaseEntity {
  @Exclude()
  @Index()
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;
}
