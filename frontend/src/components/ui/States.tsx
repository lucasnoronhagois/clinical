import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon = <Inbox />, action }: EmptyStateProps) {
  return (
    <div className="state">
      <div className="state-icon" aria-hidden>
        {icon}
      </div>
      <p className="state-title">{title}</p>
      {description && <p className="state-description">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon" aria-hidden>
        <TriangleAlert />
      </div>
      <p className="state-title">Não foi possível carregar os dados</p>
      <p className="state-description">{message}</p>
      {onRetry && (
        <Button icon={<RefreshCw />} onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius }} aria-hidden />;
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ padding: 20, display: 'grid', gap: 18 }} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: `2fr repeat(${columns - 1}, 1fr)`, gap: 24 }}>
          {Array.from({ length: columns }).map((__, col) => (
            <Skeleton key={col} height={14} width={col === 0 ? '80%' : '60%'} />
          ))}
        </div>
      ))}
    </div>
  );
}
