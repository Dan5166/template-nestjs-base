import { Repository } from 'typeorm';
import { BaseCrudService } from './base-crud.service';
import { BaseEntity } from '../entities/base.entity';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { tenantStorage } from '../tenancy/tenant-context';

class TestEntity extends BaseEntity {
  name: string;
}

/** Minimal concrete service to exercise the abstract base. */
class TestService extends BaseCrudService<TestEntity> {
  protected readonly alias = 'test';
}

describe('BaseCrudService — tenant scoping', () => {
  let repo: {
    metadata: { name: string; findColumnWithPropertyName: (prop: string) => unknown };
    findOne: jest.Mock;
    softDelete: jest.Mock;
    restore: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qb: Record<string, jest.Mock>;
  let service: TestService;

  const query = { page: 1, limit: 10, skip: 0, order: 'ASC' } as PaginationQueryDto;

  /** Build a service whose entity may or may not carry a `tenantId` column. */
  const build = (scoped: boolean): void => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo = {
      metadata: {
        name: 'TestEntity',
        findColumnWithPropertyName: (prop: string) =>
          scoped && prop === 'tenantId' ? {} : undefined,
      },
      findOne: jest.fn().mockResolvedValue({ id: 'id-1' }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(qb as unknown),
    };
    service = new TestService(repo as unknown as Repository<TestEntity>);
  };

  describe('scoped entity with an active tenant', () => {
    it('filters findOne by tenantId', async () => {
      build(true);
      await tenantStorage.run({ tenantId: 't1' }, () => service.findOne('id-1'));
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'id-1', tenantId: 't1' } });
    });

    it('scopes softDelete and restore by tenantId', async () => {
      build(true);
      await tenantStorage.run({ tenantId: 't1' }, async () => {
        await service.remove('id-1');
        await service.restore('id-1');
      });
      expect(repo.softDelete).toHaveBeenCalledWith({ id: 'id-1', tenantId: 't1' });
      expect(repo.restore).toHaveBeenCalledWith({ id: 'id-1', tenantId: 't1' });
    });

    it('adds a tenant WHERE clause in findAll', async () => {
      build(true);
      await tenantStorage.run({ tenantId: 't1' }, () => service.findAll(query));
      expect(qb.andWhere).toHaveBeenCalledWith('test.tenantId = :tenantId', { tenantId: 't1' });
    });
  });

  describe('no active tenant (MULTI_TENANT off)', () => {
    it('does not filter by tenantId', async () => {
      build(true);
      await service.findOne('id-1');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'id-1' } });
    });

    it('adds no tenant clause in findAll', async () => {
      build(true);
      await service.findAll(query);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('non-scoped entity', () => {
    it('never filters by tenantId, even with an active tenant', async () => {
      build(false);
      await tenantStorage.run({ tenantId: 't1' }, () => service.findOne('id-1'));
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'id-1' } });
    });
  });
});
