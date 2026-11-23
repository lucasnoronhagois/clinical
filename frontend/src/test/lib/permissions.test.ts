import { describe, expect, it } from 'vitest';
import {
  canFinalizeAttendance,
  canManageUsers,
  canSeeReports,
  canSeeTeam,
  canSwitchCompany,
  canWrite,
  finishForbiddenMessage,
  FORBIDDEN_FINISH_OWN,
  FORBIDDEN_FINISH_RECEPTION,
  getRoleLabel,
  isAdmin,
  isGuest,
} from '../../lib/permissions';
import { buildUser } from '../utils';

const admin = buildUser({ root: true });
const doctor = buildUser();
const otherDoctor = buildUser({ id: 3, name: 'Dr. Rafael Teixeira' });
const receptionist = buildUser({ role: 'RECEPTIONIST' });
const guest = buildUser({ role: 'GUEST' });
const ownAppointment = { user_id: doctor.id };
const otherAppointment = { user_id: otherDoctor.id };

describe('permissions', () => {
  it('rotula perfis', () => {
    expect(getRoleLabel(admin)).toBe('Administrador(a)');
    expect(getRoleLabel(doctor)).toBe('Médico(a)');
    expect(getRoleLabel(receptionist)).toBe('Recepção');
    expect(getRoleLabel(guest)).toBe('Visitante');
    expect(getRoleLabel(null)).toBe('');
  });

  it('visitante só lê e pode alternar clínicas', () => {
    expect(canWrite(guest)).toBe(false);
    expect(isGuest(guest)).toBe(true);
    expect(canSeeTeam(guest)).toBe(false);
    expect(canSwitchCompany(guest)).toBe(true);
    expect(canSeeReports(guest)).toBe(true);
    expect(canFinalizeAttendance(guest, ownAppointment)).toBe(false);
  });

  it('administrador gerencia usuários e clínicas e finaliza qualquer atendimento', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(canManageUsers(admin)).toBe(true);
    expect(canSwitchCompany(admin)).toBe(true);
    expect(canFinalizeAttendance(admin, ownAppointment)).toBe(true);
    expect(canFinalizeAttendance(admin, otherAppointment)).toBe(true);
  });

  it('equipe da clínica escreve, mas fica restrita à própria clínica', () => {
    for (const user of [doctor, receptionist]) {
      expect(canWrite(user)).toBe(true);
      expect(canSeeTeam(user)).toBe(true);
      expect(canSwitchCompany(user)).toBe(false);
      expect(canManageUsers(user)).toBe(false);
    }
    expect(canWrite(null)).toBe(false);
    expect(canSeeReports(null)).toBe(false);
  });

  it('somente o médico responsável (ou um administrador) finaliza o atendimento', () => {
    expect(canFinalizeAttendance(doctor, ownAppointment)).toBe(true);
    expect(canFinalizeAttendance(doctor, otherAppointment)).toBe(false);
    expect(canFinalizeAttendance(receptionist, ownAppointment)).toBe(false);
    expect(canFinalizeAttendance(receptionist, otherAppointment)).toBe(false);
    expect(canFinalizeAttendance(doctor, null)).toBe(false);
    expect(canFinalizeAttendance(null, ownAppointment)).toBe(false);
    expect(finishForbiddenMessage(receptionist)).toBe(FORBIDDEN_FINISH_RECEPTION);
    expect(finishForbiddenMessage(otherDoctor)).toBe(FORBIDDEN_FINISH_OWN);
  });
});
