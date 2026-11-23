import { AnimatePresence, motion } from 'motion/react';
import { Menu } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Skeleton } from '../ui';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

const titles: Record<string, string> = {
  dashboard: 'Visão geral',
  attendances: 'Atendimentos',
  patients: 'Pacientes',
  places: 'Locais',
  reports: 'Relatórios',
  users: 'Equipe',
};

export function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const { company } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const section = titles[location.pathname.split('/')[1]] ?? '';

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="sidebar-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>
      <div className="main">
        <header className="topbar">
          <Button variant="ghost" iconOnly icon={<Menu />} className="mobile-only" aria-label="Abrir menu" onClick={() => setMenuOpen(true)} />
          <div className="topbar-title">
            <small>{company?.name ?? 'ClinicalCare'}</small>
            <strong>{section}</strong>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense
                fallback={
                  <div aria-busy="true" aria-label="Carregando" style={{ display: 'grid', gap: 16 }}>
                    <Skeleton width="30%" height={28} />
                    <Skeleton height={220} radius={16} />
                  </div>
                }
              >
                {outlet}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
