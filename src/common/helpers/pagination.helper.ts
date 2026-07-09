import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { Paginated, PaginationMeta } from '../interfaces/paginated-result.interface';

/** Build pagination metadata from raw counts. */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta => {
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
};

/**
 * Paginate a TypeORM query builder. The caller is responsible for `where`,
 * joins and `orderBy`; this just applies skip/take and computes the metadata.
 */
export const paginate = async <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
): Promise<Paginated<T>> => {
  const [items, totalItems] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
  return new Paginated(items, buildPaginationMeta(query.page, query.limit, totalItems));
};

/** Paginate a plain in-memory array (useful for computed / non-DB collections). */
export const paginateArray = <T>(items: T[], query: PaginationQueryDto): Paginated<T> => {
  const slice = items.slice(query.skip, query.skip + query.limit);
  return new Paginated(slice, buildPaginationMeta(query.page, query.limit, items.length));
};
