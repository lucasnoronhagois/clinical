import { describe, expect, it } from 'vitest';
import { getErrorMessage, getFieldErrors } from '../../lib/api';
import { getStatus, matchesPeriod } from '../../lib/attendance';
import { toCsv } from '../../lib/report';
import { normalizeText } from '../../lib/text';

const axiosError = (status: number, data: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data }, config: {} });

describe('attendance helpers', () => {
  it('deriva o status a partir das datas', () => {
    expect(getStatus({ confirmed_at: null, end_date: null })).toBe('scheduled');
    expect(getStatus({ confirmed_at: '2026-03-16T10:00:00Z', end_date: null })).toBe('confirmed');
    expect(getStatus({ confirmed_at: '2026-03-16T10:00:00Z', end_date: '2026-03-16T11:00:00Z' })).toBe('finished');
    expect(getStatus({ confirmed_at: null, end_date: null, status: 'confirmed' })).toBe('confirmed');
  });

  it('filtra por período relativo', () => {
    const now = new Date(2026, 2, 16, 12, 0);
    expect(matchesPeriod('2020-01-01T00:00:00', 'all', now)).toBe(true);
    expect(matchesPeriod(new Date(2026, 2, 16, 18, 0).toISOString(), 'today', now)).toBe(true);
    expect(matchesPeriod(new Date(2026, 2, 17, 9, 0).toISOString(), 'today', now)).toBe(false);
    expect(matchesPeriod(new Date(2026, 2, 20, 9, 0).toISOString(), 'next7', now)).toBe(true);
    expect(matchesPeriod(new Date(2026, 2, 10, 9, 0).toISOString(), 'next7', now)).toBe(false);
    expect(matchesPeriod(new Date(2026, 2, 1, 9, 0).toISOString(), 'last30', now)).toBe(true);
    expect(matchesPeriod(new Date(2026, 0, 1, 9, 0).toISOString(), 'last30', now)).toBe(false);
  });
});

describe('report csv', () => {
  it('gera CSV separado por ponto e vírgula', () => {
    const csv = toCsv([{ id: 1, name: 'Dra. Marina Albuquerque', role: 'DOCTOR', total_attendances: 10, finished_attendances: 7 }]);
    expect(csv.split('\n')).toEqual(['Profissional;Perfil;Atendimentos;Finalizados', 'Dra. Marina Albuquerque;Médico(a);10;7']);
  });
});

describe('text', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalizeText('  Conceição ')).toBe('conceicao');
    expect(normalizeText(null)).toBe('');
  });
});

describe('api error helpers', () => {
  it('prioriza detalhes de validação e mensagem da API', () => {
    const validation = axiosError(400, {
      error: 'Dados inválidos',
      details: [
        { field: 'cpf', message: 'CPF inválido.' },
        { field: 'cpf', message: 'Outra.' },
      ],
    });
    expect(getErrorMessage(validation)).toBe('CPF inválido. Outra.');
    expect(getFieldErrors(validation)).toEqual({ cpf: 'CPF inválido.' });
    expect(getErrorMessage(axiosError(409, { error: 'CPF já cadastrado' }))).toBe('CPF já cadastrado');
  });

  it('explica falhas de conexão e usa fallback para erros desconhecidos', () => {
    const network = Object.assign(new Error('Network Error'), { isAxiosError: true, config: {} });
    expect(getErrorMessage(network)).toMatch(/conectar à API/);
    expect(getErrorMessage(new Error('x'), 'Falhou')).toBe('Falhou');
    expect(getFieldErrors(new Error('x'))).toEqual({});
  });
});
