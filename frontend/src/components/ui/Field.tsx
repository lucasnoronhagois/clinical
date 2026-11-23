import { cloneElement, isValidElement, ReactElement, ReactNode, useId } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: ReactElement<Record<string, unknown>>;
  action?: ReactNode;
}

/** Envolve um controle de formulário com rótulo, dica e mensagem de erro acessíveis. */
export function Field({ label, error, hint, optional, className = '', children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={`field ${className}`}>
      <label htmlFor={id} className="field-label">
        {label} {optional && <span className="optional">(opcional)</span>}
      </label>
      {control}
      {hint && !error && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
