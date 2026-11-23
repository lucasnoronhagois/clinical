import { describe, expect, it } from 'vitest';
import { buildSeries, getPeriodRange, percent, sumValues } from '../../lib/dashboard';

describe('dashboard helpers', () => {
  const today = new Date('2026-03-16T15:00:00Z');

  it('calcula intervalos inclusivos terminando hoje', () => {
    expect(getPeriodRange('7d', today)).toEqual({ start_date: '2026-03-10', end_date: '2026-03-16' });
    expect(getPeriodRange('30d', today).start_date).toBe('2026-02-15');
    expect(getPeriodRange('12m', today).start_date).toBe('2025-03-17');
  });

  it('preenche dias sem registros com zero', () => {
    const series = buildSeries({ '2026-03-10': 2, '2026-03-12': 1 }, { '2026-03-12': 3 }, '2026-03-10', '2026-03-16');
    expect(series).toHaveLength(7);
    expect(series[0]).toMatchObject({ key: '2026-03-10', label: '10/03', attendances: 2, patients: 0 });
    expect(series[2]).toMatchObject({ attendances: 1, patients: 3 });
    expect(sumValues(Object.fromEntries(series.map((p) => [p.key, p.attendances])))).toBe(3);
  });

  it('agrupa por semana em períodos médios e por mês em longos', () => {
    const weekly = buildSeries({ '2026-01-01': 1, '2026-01-08': 4 }, {}, '2026-01-01', '2026-03-01');
    expect(weekly[0]).toMatchObject({ key: '2026-01-01', attendances: 1 });
    expect(weekly[1]).toMatchObject({ key: '2026-01-08', attendances: 4 });

    const monthly = buildSeries({ '2025-04-03': 2, '2025-04-20': 3 }, {}, '2025-03-17', '2026-03-16');
    const april = monthly.find((p) => p.key === '2025-04');
    expect(april?.attendances).toBe(5);
    expect(monthly).toHaveLength(13);
  });

  it('calcula percentuais sem dividir por zero', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 0)).toBe(0);
  });
});
