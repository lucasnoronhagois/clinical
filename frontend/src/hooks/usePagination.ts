import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, paginate, Paginated } from '../lib/pagination';

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };

export interface PaginationControls<T> extends Paginated<T> {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/** Paginação no cliente: volta à página 1 quando o filtro muda e limita a página se a lista encolher. */
export function usePagination<T>(items: T[], resetKey: unknown): PaginationControls<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const result = useMemo(() => paginate(items, page, pageSize), [items, page, pageSize]);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  return { ...result, setPage, setPageSize };
}
