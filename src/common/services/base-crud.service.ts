import {
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { ResourceNotFoundException } from '../exceptions/business.exception';
import { paginate } from '../helpers/pagination.helper';
import { BaseEntity } from '../entities/base.entity';
import { Paginated } from '../interfaces/paginated-result.interface';

/**
 * Generic CRUD service over a TypeORM repository. Feature services extend it and
 * only need to declare which fields are searchable/sortable.
 *
 * ```ts
 * @Injectable()
 * export class UsersService extends BaseCrudService<User> {
 *   protected readonly alias = 'user';
 *   protected readonly searchableFields = ['email', 'firstName'];
 *   protected readonly sortableFields = ['createdAt', 'email'];
 *   constructor(@InjectRepository(User) repo: Repository<User>) { super(repo); }
 * }
 * ```
 */
export abstract class BaseCrudService<T extends BaseEntity & ObjectLiteral> {
  /** Alias used when building query builders (e.g. 'user'). */
  protected abstract readonly alias: string;
  /** Columns eligible for the free-text `search` param. */
  protected searchableFields: string[] = [];
  /** Columns clients may sort by (allow-list, prevents SQL injection via sortBy). */
  protected sortableFields: string[] = ['createdAt', 'updatedAt'];
  /** Default sort column when none/invalid is provided. */
  protected defaultSortField = 'createdAt';

  constructor(protected readonly repository: Repository<T>) {}

  protected get entityName(): string {
    return this.repository.metadata?.name ?? 'Resource';
  }

  create(dto: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<T>> {
    const qb = this.repository.createQueryBuilder(this.alias);
    this.applySearch(qb, query);
    this.applySort(qb, query);
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new ResourceNotFoundException(this.entityName, id);
    }
    return entity;
  }

  async update(id: string, dto: DeepPartial<T>): Promise<T> {
    const entity = await this.repository.preload({ id, ...dto });
    if (!entity) {
      throw new ResourceNotFoundException(this.entityName, id);
    }
    return this.repository.save(entity);
  }

  /** Soft delete (sets `deletedAt`). */
  async remove(id: string): Promise<void> {
    const result = await this.repository.softDelete(id);
    if (!result.affected) {
      throw new ResourceNotFoundException(this.entityName, id);
    }
  }

  /** Restore a soft-deleted row. */
  async restore(id: string): Promise<void> {
    const result = await this.repository.restore(id);
    if (!result.affected) {
      throw new ResourceNotFoundException(this.entityName, id);
    }
  }

  /** Hook: apply free-text search across `searchableFields`. Override to customize. */
  protected applySearch(qb: SelectQueryBuilder<T>, query: PaginationQueryDto): void {
    if (!query.search || this.searchableFields.length === 0) return;
    const conditions = this.searchableFields
      .map((field) => `${this.alias}.${field} ILIKE :search`)
      .join(' OR ');
    qb.andWhere(`(${conditions})`, { search: `%${query.search}%` });
  }

  /** Hook: apply an allow-listed sort. Override to customize. */
  protected applySort(qb: SelectQueryBuilder<T>, query: PaginationQueryDto): void {
    const sortBy =
      query.sortBy && this.sortableFields.includes(query.sortBy)
        ? query.sortBy
        : this.defaultSortField;
    qb.orderBy(`${this.alias}.${sortBy}`, query.order);
  }
}
