import { SessionUser, UserRole } from '../types';

export const roleLabels: Record<UserRole, string> = {
  DOCTOR: 'Médico(a)',
  RECEPTIONIST: 'Recepção',
  GUEST: 'Visitante',
};

export const getRoleLabel = (user: Pick<SessionUser, 'role' | 'root'> | null | undefined): string => {
  if (!user) return '';
  if (user.root) return 'Administrador(a)';
  return roleLabels[user.role] ?? user.role;
};

export const canWrite = (user: SessionUser | null | undefined): boolean => Boolean(user && user.role !== 'GUEST');
export const isAdmin = (user: SessionUser | null | undefined): boolean => Boolean(user?.root);
export const isGuest = (user: SessionUser | null | undefined): boolean => user?.role === 'GUEST';
export const canSwitchCompany = (user: SessionUser | null | undefined): boolean => Boolean(user && (user.root || user.role === 'GUEST'));
export const canSeeTeam = (user: SessionUser | null | undefined): boolean => Boolean(user && user.role !== 'GUEST');
export const canManageUsers = isAdmin;
export const canSeeReports = (user: SessionUser | null | undefined): boolean => Boolean(user);
