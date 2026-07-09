import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { buildPaginationMeta, paginateArray } from './pagination.helper';

describe('pagination helpers', () => {
  describe('buildPaginationMeta', () => {
    it('computes totals and flags for a middle page', () => {
      const meta = buildPaginationMeta(2, 10, 35);
      expect(meta).toEqual({
        page: 2,
        limit: 10,
        totalItems: 35,
        totalPages: 4,
        hasPreviousPage: true,
        hasNextPage: true,
      });
    });

    it('handles the last page', () => {
      const meta = buildPaginationMeta(4, 10, 35);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(true);
    });

    it('handles an empty result set', () => {
      const meta = buildPaginationMeta(1, 10, 0);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(false);
    });
  });

  describe('paginateArray', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const query = (page: number, limit: number): PaginationQueryDto =>
      Object.assign(new PaginationQueryDto(), { page, limit });

    it('slices the requested page', () => {
      const result = paginateArray(items, query(2, 10));
      expect(result.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      expect(result.meta.totalItems).toBe(25);
      expect(result.meta.totalPages).toBe(3);
    });
  });
});
