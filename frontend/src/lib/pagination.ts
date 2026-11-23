export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export interface Paginated<T> {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  items: T[];
}

/** Fatia uma lista no cliente e limita a página ao intervalo válido. */
export function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const total = items.length;
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const startIndex = (currentPage - 1) * size;
  const pageItems = items.slice(startIndex, startIndex + size);
  return {
    page: currentPage,
    pageSize: size,
    pageCount,
    total,
    start: total === 0 ? 0 : startIndex + 1,
    end: startIndex + pageItems.length,
    items: pageItems,
  };
}
