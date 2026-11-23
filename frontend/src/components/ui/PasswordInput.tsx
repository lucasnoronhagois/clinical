import { Eye, EyeOff } from 'lucide-react';
import { InputHTMLAttributes, useState } from 'react';
import { Button } from './Button';

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input className="input" type={visible ? 'text' : 'password'} {...props} />
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        className="password-toggle"
        icon={visible ? <EyeOff /> : <Eye />}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      />
    </div>
  );
}
