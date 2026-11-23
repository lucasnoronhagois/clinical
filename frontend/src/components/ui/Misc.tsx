import { motion } from 'motion/react';
import { ReactNode, useId } from 'react';
import { initials } from '../../lib/format';
import { AttendanceStatus } from '../../types';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Avatar({ name, size }: { name?: string | null; size?: 'sm' | 'lg' }) {
  return (
    <span className={`avatar ${size ? `avatar-${size}` : ''}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

const statusConfig: Record<AttendanceStatus, { label: string; tone: string }> = {
  scheduled: { label: 'Agendado', tone: 'badge-info' },
  confirmed: { label: 'Confirmado', tone: 'badge-warning' },
  finished: { label: 'Finalizado', tone: 'badge-success' },
};

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = statusConfig[status];
  return <span className={`badge badge-dot ${config.tone}`}>{config.label}</span>;
}

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  const layoutId = useId();
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {value === option.value && (
            <motion.span layoutId={layoutId} className="segmented-indicator" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
          )}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, icon, tone, footnote }: { label: string; value: ReactNode; icon: ReactNode; tone: string; footnote?: string }) {
  return (
    <div className="card stat-card" style={{ ['--tone' as string]: `var(--color-${tone})`, ['--tone-soft' as string]: `var(--color-${tone}-soft)` }}>
      <div className="stat-icon" aria-hidden>
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
      {footnote && <p className="stat-footnote">{footnote}</p>}
    </div>
  );
}
