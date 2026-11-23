import { LoaderCircle } from 'lucide-react';
import { ButtonHTMLAttributes, cloneElement, forwardRef, isValidElement, ReactElement, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
  iconOnly?: boolean;
  loading?: boolean;
  block?: boolean;
}

function decorateIcon(icon: ReactNode, size: number) {
  if (!isValidElement(icon)) return icon;
  const element = icon as ReactElement<{ 'aria-hidden'?: boolean | 'true' | 'false'; size?: number; focusable?: string }>;
  return cloneElement(element, {
    'aria-hidden': element.props['aria-hidden'] ?? true,
    size: element.props.size ?? size,
    focusable: 'false',
  });
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconOnly, loading, block, className = '', children, disabled, type = 'button', title, ...rest },
  ref,
) {
  const classes = ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', iconOnly && 'btn-icon', block && 'btn-block', className].filter(Boolean).join(' ');
  const iconSize = size === 'sm' ? 15 : 18;
  const label = rest['aria-label'];
  const tooltip = title ?? (iconOnly && typeof label === 'string' ? label : undefined);
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} title={tooltip} {...rest}>
      {loading ? <LoaderCircle className="spin" aria-hidden size={iconSize} /> : decorateIcon(icon, iconSize)}
      {!iconOnly && children}
    </button>
  );
});
