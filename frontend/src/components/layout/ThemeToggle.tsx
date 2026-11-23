import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
  return (
    <Button
      variant="ghost"
      iconOnly
      icon={theme === 'dark' ? <Sun /> : <Moon />}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={className}
    />
  );
}
