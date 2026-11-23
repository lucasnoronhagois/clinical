import { Op } from 'sequelize';
import { Attendance, User } from '../models/index';

export interface ReportFilters {
  company_id: number;
  role?: string;
  start_date?: string;
  end_date?: string;
}

export default class ReportService {
  /** Produtividade por profissional: médicos contam atendimentos realizados, recepcionistas os agendados por eles. */
  async getAttendanceReport({ company_id, role = 'DOCTOR', start_date, end_date }: ReportFilters) {
    const users = await User.findAll({
      where: { company_id, is_deleted: false, ...(role === 'ALL' ? { role: { [Op.ne]: 'GUEST' } } : { role }) },
      attributes: ['id', 'name', 'role', 'root'],
    });

    const range =
      start_date || end_date
        ? {
            start_date: {
              ...(start_date ? { [Op.gte]: new Date(`${start_date.slice(0, 10)}T00:00:00.000Z`) } : {}),
              ...(end_date ? { [Op.lte]: new Date(`${end_date.slice(0, 10)}T23:59:59.999Z`) } : {}),
            },
          }
        : {};

    const attendances = await Attendance.findAll({
      where: { company_id, is_deleted: false, ...range },
      attributes: ['user_id', 'receptionist_id', 'end_date'],
    });

    return users
      .map((user) => {
        const field = user.role === 'RECEPTIONIST' ? 'receptionist_id' : 'user_id';
        const mine = attendances.filter((item) => item[field] === user.id);
        return {
          id: user.id,
          name: user.name,
          role: user.role,
          total_attendances: mine.length,
          finished_attendances: mine.filter((item) => item.end_date).length,
        };
      })
      // Administradores sem atendimentos não entram no ranking de produtividade.
      .filter((row) => row.total_attendances > 0 || !users.find((user) => user.id === row.id)?.root)
      .sort((a, b) => b.total_attendances - a.total_attendances || a.name.localeCompare(b.name));
  }
}
