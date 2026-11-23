import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, paginate } from '../../lib/pagination';

describe('paginate', () => {
  it('usa 20 itens por página como padrão e oferece 20, 50 e 100', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGE_SIZE_OPTIONS).toEqual([20, 50, 100]);
  });

  it('fatiar a lista e informa o intervalo exibido', () => {
    const items = Array.from({ length: 42 }, (_, index) => index + 1);
    expect(paginate(items, 1, 20)).toMatchObject({ page: 1, pageCount: 3, total: 42, start: 1, end: 20, items: items.slice(0, 20) });
    expect(paginate(items, 3, 20)).toMatchObject({ page: 3, pageCount: 3, start: 41, end: 42, items: [41, 42] });
  });

  it('limita a página quando a lista encolhe e trata lista vazia', () => {
    const items = Array.from({ length: 10 }, (_, index) => index + 1);
    expect(paginate(items, 5, 20)).toMatchObject({ page: 1, pageCount: 1, start: 1, end: 10, items });
    expect(paginate([], 3, 20)).toMatchObject({ page: 1, pageCount: 1, total: 0, start: 0, end: 0, items: [] });
  });
});
