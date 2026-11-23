import { buildDemoDataset, createRandom, demoUsers, fakeCpf, fakePhone } from '../../src/seeders/demoData';
import { getAttendanceStatus } from '../../src/services/attendanceService';
import { cpfCheckDigits, validateCPF } from '../../src/utils';

describe('dados de demonstração', () => {
  it('gera CPFs fictícios com dígitos verificadores válidos e únicos', () => {
    const cpfs = Array.from({ length: 200 }, (_, i) => fakeCpf(i + 1));
    cpfs.forEach((cpf) => expect(validateCPF(cpf)).toBe(true));
    expect(new Set(cpfs).size).toBe(cpfs.length);
  });

  it('calcula dígitos verificadores conhecidos', () => {
    expect(cpfCheckDigits('529982247')).toBe('25');
  });

  it('usa telefones com prefixo fictício', () => {
    expect(fakePhone(7)).toBe('(81) 90000-0007');
  });

  it('é determinístico para a mesma semente e data', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    expect(buildDemoDataset(now, 1)).toEqual(buildDemoDataset(now, 1));
    expect(createRandom(5).next()).toBe(createRandom(5).next());
  });

  it('gera atendimentos coerentes com a data de referência', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const { patients, attendances } = buildDemoDataset(now);
    expect(patients).toHaveLength(58);
    expect(attendances).toHaveLength(300);
    attendances.forEach((a) => {
      if (a.end_date) {
        expect(a.confirmed_at).not.toBeNull();
        expect(a.start_date.getTime()).toBeLessThan(now.getTime());
      }
    });
    expect(attendances.some((a) => a.start_date > now)).toBe(true);
  });

  it('possui um login de demonstração por perfil', () => {
    const logins = demoUsers.map((u) => u.login);
    expect(logins).toEqual(expect.arrayContaining(['admin', 'medico', 'recepcao', 'visitante']));
    expect(demoUsers.every((u) => u.email.endsWith('.example'))).toBe(true);
  });
});

describe('getAttendanceStatus', () => {
  it.each([
    [{ confirmed_at: null, end_date: null }, 'scheduled'],
    [{ confirmed_at: new Date(), end_date: null }, 'confirmed'],
    [{ confirmed_at: new Date(), end_date: new Date() }, 'finished'],
  ])('%p => %s', (input, expected) => {
    expect(getAttendanceStatus(input)).toBe(expected);
  });
});
