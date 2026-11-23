import { SessionUser, UserRole } from '../types';

export const roleLabels: Record<UserRole, string> = {
  DOCTOR: 'Médico(a)',
  RECEPTIONIST: 'Recepção',
  GUEST: 'Visitante',
};

export const FORBIDDEN_FINISH_RECEPTION = 'A recepção não pode finalizar atendimentos.';
export const FORBIDDEN_FINISH_OWN = 'Você só pode finalizar os próprios atendimentos.';

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

/** Confirmar, agendar e editar dados da agenda (paciente, local e horário). */
export const canManageSchedule = canWrite;

/**
 * Finalizar um atendimento (status Finalizado).
 * Administradores finalizam qualquer um; médicos, apenas os próprios; recepção e visitantes, nenhum.
 */
export const canFinalizeAttendance = (
  user: Pick<SessionUser, 'id' | 'role' | 'root'> | null | undefined,
  attendance: { user_id: number } | null | undefined,
): boolean => {
  if (!user || !attendance) return false;
  if (user.root) return true;
  return user.role === 'DOCTOR' && user.id === attendance.user_id;
};

export const finishForbiddenMessage = (user: Pick<SessionUser, 'role' | 'root'> | null | undefined): string => {
  if (user?.role === 'RECEPTIONIST' && !user.root) return FORBIDDEN_FINISH_RECEPTION;
  return FORBIDDEN_FINISH_OWN;
};
