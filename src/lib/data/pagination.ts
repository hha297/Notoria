export type PageParams = { page?: number; pageSize?: number };

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function normalizePageParams(params?: PageParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const rawPage = params?.page ?? 1;
  const rawPageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;

  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(rawPageSize)))
    : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const safeTotal = Math.max(0, total);
  const safePageSize = Math.max(1, pageSize);

  return {
    items,
    page,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages: Math.ceil(safeTotal / safePageSize),
  };
}
