export type PeriodKey = '7d' | '30d' | '90d' | '12m';

export const PERIODS: Array<{ value: PeriodKey; label: string; days: number }> = [
  { value: '7d', label: '7 dias', days: 7 },
  { value: '30d', label: '30 dias', days: 30 },
  { value: '90d', label: '90 dias', days: 90 },
  { value: '12m', label: '12 meses', days: 365 },
];

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Período fechado terminando hoje (inclusive) e incluindo os próximos 14 dias de agenda. */
export function getPeriodRange(period: PeriodKey, today = new Date()) {
  const days = PERIODS.find((p) => p.value === period)?.days ?? 30;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1)));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return { start_date: iso(start), end_date: iso(end) };
}

export interface SeriesPoint {
  key: string;
  label: string;
  attendances: number;
  patients: number;
}

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

/**
 * Agrupa as contagens diárias da API em uma série contínua (dias sem registros viram zero).
 * Até 31 dias agrupa por dia, até 120 dias por semana e acima disso por mês.
 */
export function buildSeries(
  attendancesByDay: Record<string, number>,
  patientsByDay: Record<string, number>,
  startDate: string,
  endDate: string,
): SeriesPoint[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const mode = totalDays <= 31 ? 'day' : totalDays <= 120 ? 'week' : 'month';

  const buckets = new Map<string, SeriesPoint>();
  for (let i = 0; i < totalDays; i += 1) {
    const day = new Date(start.getTime() + i * 86400000);
    const dayKey = iso(day);
    let key = dayKey;
    let label = dayFormatter.format(day);
    if (mode === 'week') {
      const bucketStart = new Date(start.getTime() + Math.floor(i / 7) * 7 * 86400000);
      key = iso(bucketStart);
      label = dayFormatter.format(bucketStart);
    } else if (mode === 'month') {
      key = dayKey.slice(0, 7);
      label = monthFormatter.format(day).replace('.', '');
    }
    const bucket = buckets.get(key) ?? { key, label, attendances: 0, patients: 0 };
    bucket.attendances += attendancesByDay[dayKey] ?? 0;
    bucket.patients += patientsByDay[dayKey] ?? 0;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values());
}

export const sumValues = (record: Record<string, number>) => Object.values(record).reduce((acc, value) => acc + value, 0);

export const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
