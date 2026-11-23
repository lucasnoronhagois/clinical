import { LucideIcon, LucideProps } from 'lucide-react';

type IconSize = 'sm' | 'md' | 'lg' | number;

const sizes: Record<'sm' | 'md' | 'lg', number> = { sm: 15, md: 18, lg: 22 };

interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  icon: LucideIcon;
  size?: IconSize;
  /** Ícones decorativos ficam ocultos para leitores de tela (padrão). */
  decorative?: boolean;
}

/** Wrapper único para ícones Lucide: tamanho consistente e aria-hidden nos decorativos. */
export function Icon({ icon: Glyph, size = 'md', decorative = true, strokeWidth = 2, ...rest }: IconProps) {
  const pixels = typeof size === 'number' ? size : sizes[size];
  return <Glyph size={pixels} strokeWidth={strokeWidth} aria-hidden={decorative ? true : rest['aria-hidden']} focusable="false" {...rest} />;
}
