import { describe, expect, it } from 'vitest';
import { decodeToken, isTokenExpired, sessionFromToken } from '../../lib/session';
import { makeToken } from '../utils';

describe('session', () => {
  it('decodifica o payload do JWT, inclusive com acentos', () => {
    const payload = decodeToken(makeToken({ name: 'Conceição Araújo' }));
    expect(payload?.name).toBe('Conceição Araújo');
  });

  it('retorna null para tokens ausentes ou malformados', () => {
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken('abc')).toBeNull();
    expect(decodeToken('a.%%%.c')).toBeNull();
  });

  it('detecta expiração', () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired(decodeToken(makeToken({}, -10)))).toBe(true);
    expect(isTokenExpired(decodeToken(makeToken({}, 60)))).toBe(false);
  });

  it('monta a sessão apenas com campos conhecidos', () => {
    const session = sessionFromToken(makeToken({ root: true }));
    expect(session).toEqual({ id: 2, name: 'Dra. Marina Albuquerque', email: 'medico@vidaplena.example', role: 'DOCTOR', root: true, company_id: 1 });
    expect(sessionFromToken(makeToken({}, -1))).toBeNull();
  });
});
