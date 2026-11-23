import { describe, expect, it } from 'vitest';
import { isValidCPF, isValidEmail, required } from '../../lib/validators';

describe('validators', () => {
  it('valida dígitos verificadores do CPF', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('52998224724')).toBe(false);
    expect(isValidCPF('11111111111')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
  });

  it('valida emails', () => {
    expect(isValidEmail('medico@vidaplena.example')).toBe(true);
    expect(isValidEmail(' a@b.co ')).toBe(true);
    expect(isValidEmail('sem-arroba')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(false);
  });

  it('exige valor preenchido', () => {
    expect(required('')).toBe('Campo obrigatório.');
    expect(required('   ', 'Informe o nome.')).toBe('Informe o nome.');
    expect(required(null)).toBeDefined();
    expect(required(0)).toBeUndefined();
    expect(required('ok')).toBeUndefined();
  });
});
