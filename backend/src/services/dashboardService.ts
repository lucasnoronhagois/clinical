import { Op } from 'sequelize';
import { HttpError } from '../errors/HttpError';
import { Attendance, Patient, Place, User } from '../models/index';
import { getAttendanceStatus } from './attendanceService';

export interface DashboardFilters {
  company_id: number;
  start_date?: string;
  end_date?: string;
  now?: Date;
}

const dayKey = (value: Date | string): string => new Date(value).toISOString().slice(0, 10);

const countBy = <T>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

export default class DashboardService {
  async getStatistics({ company_id, start_date, end_date, now = new Date() }: DashboardFilters) {
    const start = start_date ? new Date(`${start_date.slice(0, 10)}T00:00:00.000Z`) : undefined;
    const end = end_date ? new Date(`${end_date.slice(0, 10)}T23:59:59.999Z`) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      throw HttpError.badRequest('Datas inválidas.');
    }
    if (start && end && end < start) {
      throw HttpError.badRequest('A data final não pode ser anterior à data inicial.');
    }

    const range = start || end ? { ...(start ? { [Op.gte]: start } : {}), ...(end ? { [Op.lte]: end } : {}) } : undefined;
    const base = { company_id, is_deleted: false };

    const [totalPatients, totalAttendances, totalUsers, totalPlaces, attendances, patients, upcoming] = await Promise.all([
      Patient.count({ where: base }),
      Attendance.count({ where: base }),
      User.count({ where: base }),
      Place.count({ where: base }),
      Attendance.findAll({
        where: { ...base, ...(range ? { start_date: range } : {}) },
        attributes: ['id', 'start_date', 'confirmed_at', 'end_date', 'place_id', 'user_id'],
        include: [
          { association: 'place', attributes: ['name'] },
          { association: 'user', attributes: ['name'] },
        ],
      }),
      Patient.findAll({ where: { ...base, ...(range ? { created_at: range } : {}) }, attributes: ['id', 'created_at'] }),
      Attendance.findAll({
        where: { ...base, end_date: null, start_date: { [Op.gte]: now } },
        include: [
          { association: 'patient', attributes: ['id', 'name'] },
          { association: 'user', attributes: ['id', 'name'] },
          { association: 'place', attributes: ['id', 'name'] },
        ],
        order: [['start_date', 'ASC']],
        limit: 5,
      }),
    ]);

    const byStatus = { scheduled: 0, confirmed: 0, finished: 0 };
    attendances.forEach((item) => {
      byStatus[getAttendanceStatus(item)] += 1;
    });

    const plain = attendances.map((item) => item.get({ plain: true }) as Attendance & { place?: { name: string }; user?: { name: string } });
    const toRanking = (counts: Record<string, number>) =>
      Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return {
      totalPatients,
      totalAttendances,
      totalUsers,
      totalPlaces,
      period: { start_date: start ? dayKey(start) : null, end_date: end ? dayKey(end) : null },
      attendancesByStatus: byStatus,
      attendancesByPlace: toRanking(countBy(plain, (item) => item.place?.name ?? 'Sem local')),
      attendancesByProfessional: toRanking(countBy(plain, (item) => item.user?.name ?? 'Sem profissional')).slice(0, 5),
      upcomingAttendances: upcoming.map((item) => ({ ...item.get({ plain: true }), status: getAttendanceStatus(item) })),
      details: {
        attendances_by_day: countBy(plain, (item) => dayKey(item.start_date)),
        patients_by_day: countBy(patients, (item) => dayKey(item.created_at)),
      },
    };
  }
}
