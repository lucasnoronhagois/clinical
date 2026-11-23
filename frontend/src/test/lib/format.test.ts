import { describe, expect, it } from 'vitest';
import { calculateAge, formatCEP, formatCPF, formatDate, formatNumber, formatPhone, initials, onlyDigits, toDateInput } from '../../lib/format';

describe('format', () => {
  it('formata CPF progressivamente', () => {
    expect(formatCPF('12345678909')).toBe('123.456.789-09');
    expect(formatCPF('1234')).toBe('123.4');
    expect(formatCPF('123.456.789-09999')).toBe('123.456.789-09');
    expect(formatCPF(null)).toBe('');
  });

  it('formata CEP e telefone', () => {
    expect(formatCEP('50000000')).toBe('50000-000');
    expect(formatCEP('')).toBe('');
    expect(formatPhone('81')).toBe('(81');
    expect(formatPhone('81900')).toBe('(81) 900');
    expect(formatPhone('8132221234')).toBe('(81) 3222-1234');
    expect(formatPhone('81900001234')).toBe('(81) 90000-1234');
    expect(formatPhone(undefined)).toBe('');
  });

  it('exibe datas sem horário em UTC e trata valores inválidos', () => {
    expect(formatDate('1990-05-20')).toBe('20/05/1990');
    expect(formatDate('não é data')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(toDateInput('1990-05-20T00:00:00.000Z')).toBe('1990-05-20');
    expect(toDateInput(null)).toBe('');
  });

  it('calcula idade considerando o aniversário', () => {
    const today = new Date('2026-03-16T12:00:00Z');
    expect(calculateAge('1990-03-16', today)).toBe(36);
    expect(calculateAge('1990-03-17', today)).toBe(35);
    expect(calculateAge('1990-12-01', today)).toBe(35);
  });

  it('gera iniciais ignorando o título Dr./Dra.', () => {
    expect(initials('Dra. Marina Albuquerque')).toBe('MA');
    expect(initials('Carla')).toBe('C');
    expect(initials('')).toBe('?');
  });

  it('extrai dígitos e formata números', () => {
    expect(onlyDigits('(81) 9-0000')).toBe('8190000');
    expect(formatNumber(1234)).toBe('1.234');
  });
});
