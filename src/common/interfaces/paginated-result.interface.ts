/** Pagination metadata returned alongside a page of results. */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * A page of results. Returned by services and detected by the transform
 * interceptor, which flattens it into `{ data: items, meta: { ...pagination } }`.
 */
export class Paginated<T> {
  readonly items: T[];
  readonly meta: PaginationMeta;

  constructor(items: T[], meta: PaginationMeta) {
    this.items = items;
    this.meta = meta;
  }
}
