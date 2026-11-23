import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../../hooks/usePagination';
import { Button } from './Button';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function PaginationBar({ page, pageSize, pageCount, total, start, end, onPageChange, onPageSizeChange }: PaginationBarProps) {
  return (
    <div className="pagination" role="navigation" aria-label="Paginação">
      <p className="pagination-count muted">
        Mostrando {start} a {end} de {total}
      </p>
      <label className="pagination-size">
        <span>Itens por página</span>
        <select className="select" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="Itens por página">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="pagination-nav">
        <Button size="sm" icon={<ChevronLeft />} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
          Anterior
        </Button>
        <span className="pagination-status" aria-live="polite">
          Página {page} de {pageCount}
        </span>
        <Button size="sm" icon={<ChevronRight />} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Próxima página">
          Próxima
        </Button>
      </div>
    </div>
  );
}
