import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SessionUser } from '../../types';

/** Exige usuário autenticado e clínica selecionada. */
export function RequireCompany({ children }: { children: ReactNode }) {
  const { user, companyId } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!companyId) return <Navigate to="/select-company" replace />;
  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequirePermission({ check, children }: { check: (user: SessionUser | null) => boolean; children: ReactNode }) {
  const { user } = useAuth();
  if (!check(user)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
