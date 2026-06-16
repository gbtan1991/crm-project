export const ADMIN_PAGE_SIZE = 10;

export type Paginated<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Parses a `page` query param into a 1-based integer (defaults to 1). */
export function parsePageParam(
  value: string | string[] | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Clamps a requested page to the valid range given a total count. */
export function resolvePage(
  requestedPage: number,
  total: number,
  pageSize: number,
): { page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, totalPages };
}
