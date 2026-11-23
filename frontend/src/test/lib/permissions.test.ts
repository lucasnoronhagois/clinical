import { describe, expect, it } from 'vitest';
import { canManageUsers, canSeeReports, canSeeTeam, canSwitchCompany, canWrite, getRoleLabel, isAdmin, isGuest } from '../../lib/permissions';
import { buildUser } from '../utils';

const admin = buildUser({ root: true });
const doctor = buildUser();
const receptionist = buildUser({ role: 'RECEPTIONIST' });
const guest = buildUser({ role: 'GUEST' });

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
  });

  it('administrador gerencia usuários e clínicas', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(canManageUsers(admin)).toBe(true);
    expect(canSwitchCompany(admin)).toBe(true);
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
});
