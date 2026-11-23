import { ReportRow } from '../types';
import { getRoleLabel } from './permissions';

export function toCsv(rows: ReportRow[]): string {
  const header = 'Profissional;Perfil;Atendimentos;Finalizados';
  const lines = rows.map((r) => [r.name, getRoleLabel({ role: r.role, root: false }), r.total_attendances, r.finished_attendances].join(';'));
  return [header, ...lines].join('\n');
}
