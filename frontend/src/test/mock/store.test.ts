import { describe, expect, it } from 'vitest';
import { buildMockData, fakeCpf } from '../../mock/fixtures';
import { createMockStore, MOCK_STORAGE_KEY } from '../../mock/store';
import { isValidCPF } from '../../lib/validators';

describe('fixtures da API interna', () => {
  it('gera dados determinísticos e claramente fictícios', () => {
    const now = new Date('2026-03-16T12:00:00Z');
    const a = buildMockData(now);
    const b = buildMockData(now);
    expect(a).toEqual(b);
    expect(a.companies).toHaveLength(2);
    expect(a.users).toHaveLength(10);
    expect(a.patients).toHaveLength(58);
    expect(a.attendances).toHaveLength(300);
    expect(a.users.every((u) => u.email.endsWith('.example') && u.phone?.startsWith('(81) 90000-'))).toBe(true);
    expect(a.companies.every((c) => c.email.endsWith('.example'))).toBe(true);
  });

  it('mantém regras de negócio coerentes nos atendimentos', () => {
    const now = new Date('2026-03-16T12:00:00Z');
    const { attendances } = buildMockData(now);
    for (const a of attendances) {
      if (a.end_date) expect(a.confirmed_at).not.toBeNull();
      if (new Date(a.start_date) > now) expect(a.end_date).toBeNull();
    }
  });

  it('gera CPFs com dígitos verificadores válidos', () => {
    expect([1, 2, 3, 500].every((i) => isValidCPF(fakeCpf(i)))).toBe(true);
  });
});

describe('store da API interna', () => {
  it('persiste alterações no localStorage quando habilitado', () => {
    const store = createMockStore({ persist: true });
    store.data.places[0].name = 'Sala Renomeada';
    store.save();
    expect(createMockStore({ persist: true }).data.places[0].name).toBe('Sala Renomeada');
    store.reset();
    expect(createMockStore({ persist: true }).data.places[0].name).toBe('Consultório 1');
  });

  it('regenera dados antigos, corrompidos ou de outra versão', () => {
    localStorage.setItem(MOCK_STORAGE_KEY, '{quebrado');
    expect(createMockStore({ persist: true }).data.users).toHaveLength(10);

    localStorage.clear();
    const old = createMockStore({ persist: true, now: () => new Date('2020-01-01T00:00:00Z') });
    old.data.places[0].name = 'Antigo';
    old.save();
    expect(createMockStore({ persist: true }).data.places[0].name).toBe('Consultório 1');
  });

  it('não grava nada quando a persistência está desligada', () => {
    createMockStore();
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBeNull();
  });
});
