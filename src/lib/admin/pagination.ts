export const ADMIN_PAGE_SIZE = 25;

export type AdminListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export function normalizeAdminListParams(input: {
  q?: string | null;
  page?: string | number | null;
  pageSize?: string | number | null;
}): { q: string; page: number; pageSize: number; offset: number } {
  const q = (input.q ?? "").trim();
  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(input.pageSize) || ADMIN_PAGE_SIZE),
  );
  return { q, page, pageSize, offset: (page - 1) * pageSize };
}

export function adminTotalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
