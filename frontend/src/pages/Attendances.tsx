import { motion } from 'motion/react';
import { CalendarCheck, CalendarPlus, Check, Flag, Pencil, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, StatusBadge, TableSkeleton } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AttendanceFormModal } from '../features/AttendanceFormModal';
import { ReadOnlyBanner } from '../features/ReadOnlyBanner';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, getErrorMessage } from '../lib/api';
import { getStatus, matchesPeriod, PeriodFilter } from '../lib/attendance';
import { formatDateLocal, formatTime } from '../lib/format';
import { canSeeTeam, canWrite } from '../lib/permissions';
import { normalizeText } from '../lib/text';
import { Attendance, AttendanceStatus, Patient, Place, User } from '../types';

type StatusFilter = 'all' | AttendanceStatus;

export default function Attendances() {
  useDocumentTitle('Atendimentos');
  const { user, companyId } = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const writable = canWrite(user);

  const attendances = useApi<Attendance[]>('/attendances', { company_id: companyId });
  const patients = useApi<Patient[]>(writable ? '/patients' : null, { company_id: companyId });
  const places = useApi<Place[]>(writable ? '/places' : null, { company_id: companyId });
  const doctors = useApi<{ users: User[] }>(canSeeTeam(user) ? '/users' : null, { company_id: companyId, role: 'DOCTOR' });

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [doctorId, setDoctorId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [deleting, setDeleting] = useState<Attendance | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [defaultPatientId, setDefaultPatientId] = useState<number | undefined>();

  // Permite abrir o formulário já com o paciente selecionado (ex.: a partir da ficha do paciente).
  useEffect(() => {
    const patient = Number(params.get('patient'));
    if (patient && writable) {
      setDefaultPatientId(patient);
      setEditing(null);
      setFormOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams, writable]);

  const professionals = useMemo(() => {
    const map = new Map<number, string>();
    (attendances.data ?? []).forEach((a) => a.user && map.set(a.user.id, a.user.name));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [attendances.data]);

  const filtered = useMemo(() => {
    const term = normalizeText(query);
    return (attendances.data ?? []).filter(
      (a) =>
        (status === 'all' || getStatus(a) === status) &&
        (!doctorId || String(a.user_id) === doctorId) &&
        matchesPeriod(a.start_date, period) &&
        (!term || normalizeText(a.patient?.name).includes(term)),
    );
  }, [attendances.data, query, status, doctorId, period]);

  const counts = useMemo(() => {
    const result = { scheduled: 0, confirmed: 0, finished: 0 };
    (attendances.data ?? []).forEach((a) => (result[getStatus(a)] += 1));
    return result;
  }, [attendances.data]);

  const replace = (updated: Attendance) =>
    attendances.setData((current) => {
      const others = current?.filter((a) => a.id !== updated.id) ?? [];
      return [...others, updated].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    });

  const transition = async (attendance: Attendance, action: 'confirm' | 'finish') => {
    setBusyId(attendance.id);
    try {
      const { data } = await api.put<Attendance>(`/attendances/${attendance.id}/${action}`);
      replace(data);
      toast.success(action === 'confirm' ? 'Atendimento confirmado.' : 'Atendimento finalizado.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api.delete(`/attendances/${deleting.id}`);
      attendances.setData((current) => current?.filter((a) => a.id !== deleting.id) ?? null);
      toast.success('Atendimento excluído.');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title="Atendimentos"
        description={`${counts.scheduled} agendados, ${counts.confirmed} confirmados e ${counts.finished} finalizados.`}
        actions={
          writable && (
            <Button
              variant="primary"
              icon={<CalendarPlus />}
              onClick={() => {
                setEditing(null);
                setDefaultPatientId(undefined);
                setFormOpen(true);
              }}
            >
              Novo atendimento
            </Button>
          )
        }
      />
      {!writable && <ReadOnlyBanner />}

      <section className="card">
        <div className="toolbar">
          <div className="input-icon">
            <Search aria-hidden />
            <input
              className="input"
              type="search"
              placeholder="Buscar paciente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar por paciente"
            />
          </div>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Filtrar por status">
            <option value="all">Todos os status</option>
            <option value="scheduled">Agendados</option>
            <option value="confirmed">Confirmados</option>
            <option value="finished">Finalizados</option>
          </select>
          <select className="select" value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)} aria-label="Filtrar por período">
            <option value="all">Qualquer data</option>
            <option value="today">Hoje</option>
            <option value="next7">Próximos 7 dias</option>
            <option value="last30">Últimos 30 dias</option>
          </select>
          <select className="select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Filtrar por profissional">
            <option value="">Todos os profissionais</option>
            {professionals.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {attendances.loading && !attendances.data ? (
          <TableSkeleton columns={5} />
        ) : attendances.error ? (
          <ErrorState message={attendances.error} onRetry={attendances.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CalendarCheck />} title="Nenhum atendimento encontrado" description="Ajuste os filtros ou agende um novo atendimento." />
        ) : (
          <div className="table-wrap">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Profissional</th>
                  <th scope="col">Local</th>
                  <th scope="col">Status</th>
                  {writable && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((attendance, index) => {
                  const current = getStatus(attendance);
                  return (
                    <motion.tr key={attendance.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index * 0.012, 0.25) }}>
                      <td data-label="Data" className="tabular">
                        <div className="cell-title">{formatDateLocal(attendance.start_date)}</div>
                        <div className="cell-sub">{formatTime(attendance.start_date)}</div>
                      </td>
                      <td data-label="Paciente">
                        <Link to={`/patients/${attendance.patient_id}`} className="cell-title" style={{ color: 'inherit' }}>
                          {attendance.patient?.name}
                        </Link>
                      </td>
                      <td data-label="Profissional">{attendance.user?.name}</td>
                      <td data-label="Local">{attendance.place?.name}</td>
                      <td data-label="Status">
                        <StatusBadge status={current} />
                      </td>
                      {writable && (
                        <td data-label="">
                          <div className="actions">
                            {current === 'scheduled' && (
                              <Button size="sm" icon={<Check />} loading={busyId === attendance.id} onClick={() => transition(attendance, 'confirm')}>
                                Confirmar
                              </Button>
                            )}
                            {current === 'confirmed' && (
                              <Button size="sm" icon={<Flag />} loading={busyId === attendance.id} onClick={() => transition(attendance, 'finish')}>
                                Finalizar
                              </Button>
                            )}
                            {current !== 'finished' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={<Pencil />}
                                aria-label="Editar atendimento"
                                onClick={() => {
                                  setEditing(attendance);
                                  setFormOpen(true);
                                }}
                              />
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={<Trash2 />}
                              aria-label="Excluir atendimento"
                              onClick={() => setDeleting(attendance)}
                            />
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="muted" style={{ padding: 16, fontSize: 'var(--text-sm)' }}>
                Mostrando os 200 mais recentes de {filtered.length}. Use os filtros para refinar.
              </p>
            )}
          </div>
        )}
      </section>

      {writable && (
        <AttendanceFormModal
          open={formOpen}
          attendance={editing}
          companyId={companyId}
          patients={patients.data ?? []}
          places={places.data ?? []}
          doctors={doctors.data?.users ?? []}
          defaultPatientId={defaultPatientId}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            setFormOpen(false);
            replace(saved);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir atendimento?"
        description={`O atendimento de ${deleting?.patient?.name ?? ''} em ${formatDateLocal(deleting?.start_date)} será removido da agenda.`}
        confirmLabel="Excluir"
        loading={busyId === deleting?.id}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
