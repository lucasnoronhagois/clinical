import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, DatabaseBackup, KeyRound, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/api';
import { getRoleLabel } from '../../lib/permissions';
import { isMockApiUrl } from '../../mock/config';
import { Avatar } from '../ui';
import { ChangePasswordModal } from './ChangePasswordModal';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Avatar name={user.name} size="sm" />
        <span className="user-trigger-text">
          <strong>{user.name}</strong>
          <small>{getRoleLabel(user)}</small>
        </span>
        <ChevronDown size={16} aria-hidden style={{ color: 'var(--color-text-subtle)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="dropdown"
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <div className="dropdown-header">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            {user.role !== 'GUEST' && (
              <button
                type="button"
                role="menuitem"
                className="dropdown-item"
                onClick={() => {
                  setOpen(false);
                  setChanging(true);
                }}
              >
                <KeyRound aria-hidden /> Alterar senha
              </button>
            )}
            {isMockApiUrl(API_BASE_URL) && (
              <button
                type="button"
                role="menuitem"
                className="dropdown-item"
                onClick={async () => {
                  const { mockStore } = await import('../../mock/browser');
                  mockStore.reset();
                  window.location.reload();
                }}
              >
                <DatabaseBackup aria-hidden /> Restaurar dados de demonstração
              </button>
            )}
            <button type="button" role="menuitem" className="dropdown-item danger" onClick={logout}>
              <LogOut aria-hidden /> Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <ChangePasswordModal open={changing} onClose={() => setChanging(false)} />
    </div>
  );
}
