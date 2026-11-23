import { motion } from 'motion/react';
import { ArrowLeftRight, Building2, CalendarCheck, ChartColumn, LayoutDashboard, MapPin, Stethoscope, Users } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canManageUsers, canSwitchCompany } from '../../lib/permissions';
import { Brand } from './Brand';

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { user, company, clearCompany } = useAuth();
  const navigate = useNavigate();

  const items = [
    { to: '/dashboard', label: 'Visão geral', icon: <LayoutDashboard /> },
    { to: '/attendances', label: 'Atendimentos', icon: <CalendarCheck /> },
    { to: '/patients', label: 'Pacientes', icon: <Stethoscope /> },
    { to: '/places', label: 'Locais', icon: <MapPin /> },
    { to: '/reports', label: 'Relatórios', icon: <ChartColumn /> },
    ...(canManageUsers(user) ? [{ to: '/users', label: 'Equipe', icon: <Users /> }] : []),
  ];

  const switchable = canSwitchCompany(user);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Menu principal">
      <Brand />
      <nav>
        <p className="nav-section-label">Clínica</p>
        <ul className="nav" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-active" className="nav-active-bg" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    {item.icon}
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className="company-chip"
          disabled={!switchable}
          onClick={() => {
            clearCompany();
            onNavigate();
            navigate('/select-company');
          }}
          title={switchable ? 'Trocar de clínica' : undefined}
        >
          <Building2 aria-hidden />
          <span className="company-chip-text">
            <strong>{company?.name ?? 'Carregando clínica'}</strong>
            <small>{company ? `${company.adress_city}, ${company.adress_state}` : ' '}</small>
          </span>
          {switchable && <ArrowLeftRight aria-hidden style={{ marginLeft: 'auto', color: 'var(--color-text-subtle)' }} />}
        </button>
      </div>
    </aside>
  );
}
