import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { getTenantId } from './tenant-context';

type TenantRow = { tenantId?: string | null };

/**
 * Stamps the active tenant on any entity that has a `tenantId` column, covering
 * every insert path (create/save, OAuth user creation, seeds within a context).
 * On update it pins `tenantId` back to the stored value, so a row can never be
 * moved to another tenant. A no-op for entities without the column and while no
 * tenant is active (i.e. `MULTI_TENANT=false`).
 */
@Injectable()
export class TenantSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    // Self-register; TypeORM has no DI, so we attach to the connection here.
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<TenantRow>): void {
    if (!event.metadata.findColumnWithPropertyName('tenantId')) return;
    const tenantId = getTenantId();
    const entity = event.entity;
    if (tenantId && entity && entity.tenantId == null) {
      entity.tenantId = tenantId;
    }
  }

  beforeUpdate(event: UpdateEvent<TenantRow>): void {
    if (!event.metadata.findColumnWithPropertyName('tenantId')) return;
    const { entity, databaseEntity } = event;
    // tenantId is immutable — keep whatever is already persisted.
    if (entity && databaseEntity) {
      (entity as TenantRow).tenantId = databaseEntity.tenantId ?? null;
    }
  }
}
