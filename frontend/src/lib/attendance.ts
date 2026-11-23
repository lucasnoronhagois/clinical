import { Attendance, AttendanceStatus } from '../types';

export const getStatus = (attendance: Pick<Attendance, 'confirmed_at' | 'end_date' | 'status'>): AttendanceStatus => {
  if (attendance.status) return attendance.status;
  if (attendance.end_date) return 'finished';
  if (attendance.confirmed_at) return 'confirmed';
  return 'scheduled';
};

export type PeriodFilter = 'all' | 'today' | 'next7' | 'last30';

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function matchesPeriod(startDate: string, period: PeriodFilter, now = new Date()): boolean {
  if (period === 'all') return true;
  const date = new Date(startDate);
  const today = startOfDay(now);
  const day = 86400000;
  if (period === 'today') return date >= today && date < new Date(today.getTime() + day);
  if (period === 'next7') return date >= now && date < new Date(today.getTime() + 8 * day);
  return date >= new Date(today.getTime() - 30 * day) && date <= now;
}
