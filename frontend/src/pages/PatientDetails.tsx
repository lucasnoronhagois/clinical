import { motion } from 'motion/react';
import { ArrowLeft, CalendarCheck, CalendarPlus, Cake, IdCard, Pencil, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, EmptyState, ErrorState, Skeleton, StatCard, StatusBadge } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { PatientFormModal } from '../features/PatientFormModal';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getStatus } from '../lib/attendance';
import { calculateAge, formatCPF, formatDate, formatDateLocal, formatDateTime } from '../lib/format';
import { canWrite } from '../lib/permissions';
import { Attendance, Patient } from '../types';

const dotColor = { scheduled: 'var(--color-info)', confirmed: 'var(--color-warning)', finished: 'var(--color-success)' };

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, companyId } = useSession();
  const patient = useApi<Patient>(`/patients/${id}`);
  const history = useApi<Attendance[]>('/attendances', { company_id: companyId, patient_id: id });
  const [editing, setEditing] = useState(false);
  useDocumentTitle(patient.data?.name ?? 'Paciente');

  const stats = useMemo(() => {
    const items = history.data ?? [];
    const now = Date.now();
    const finished = items.filter((a) => getStatus(a) === 'finished').length;
    const next = items
      .filter((a) => new Date(a.start_date).getTime() >= now && getStatus(a) !== 'finished')
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
    return { total: items.length, finished, next };
  }, [history.data]);

  if (patient.loading && !patient.data) {
    return (
      <div className="card profile-header" aria-busy="true">
        <Skeleton width={56} height={56} radius={28} />
        <div style={{ flex: 1, display: 'grid', gap: 10 }}>
          <Skeleton width="40%" height={20} />
          <Skeleton width="60%" />
        </div>
      </div>
    );
  }

  if (patient.error || !patient.data) {
    return (
      <div className="card">
        <ErrorState message={patient.error ?? 'Paciente não encontrado.'} onRetry={patient.reload} />
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 24 }}>
          <Button icon={<ArrowLeft />} onClick={() => navigate('/patients')}>
            Voltar para pacientes
          </Button>
        </div>
      </div>
    );
  }

  const data = patient.data;
  const writable = canWrite(user);

  return (
    <>
      <Link to="/patients" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft /> Pacientes
      </Link>

      <motion.section className="card profile-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Avatar name={data.name} size="lg" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 className="page-title" style={{ fontSize: 'var(--text-xl)' }}>
            {data.name}
          </h1>
          <div className="profile-meta">
            <span>
              <Cake aria-hidden /> {calculateAge(data.birth_date)} anos
            </span>
            <span>
              <IdCard aria-hidden /> {data.cpf ? formatCPF(data.cpf) : 'CPF não informado'}
            </span>
            <span>
              <UserRound aria-hidden /> Paciente desde {formatDateLocal(data.created_at)}
            </span>
          </div>
        </div>
        {writable && (
          <div className="page-actions">
            <Button icon={<Pencil />} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="primary" icon={<CalendarPlus />} onClick={() => navigate(`/attendances?patient=${data.id}`)}>
              Agendar
            </Button>
          </div>
        )}
      </motion.section>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 16 }}>
        <StatCard label="Atendimentos" value={stats.total} icon={<CalendarCheck />} tone="primary" />
        <StatCard label="Finalizados" value={stats.finished} icon={<CalendarCheck />} tone="success" />
        <StatCard
          label="Próxima consulta"
          value={stats.next ? formatDateLocal(stats.next.start_date) : 'Nenhuma'}
          icon={<CalendarPlus />}
          tone="accent"
          footnote={stats.next?.user?.name}
        />
      </div>

      <div className="detail-grid">
        <section className="card" aria-labelledby="patient-data">
          <div className="card-header">
            <h2 id="patient-data" className="card-title">
              Dados cadastrais
            </h2>
          </div>
          <div className="card-body">
            <dl className="kv-list" style={{ margin: 0 }}>
              <div>
                <dt>Nome completo</dt>
                <dd>{data.name}</dd>
              </div>
              <div>
                <dt>Data de nascimento</dt>
                <dd>{formatDate(data.birth_date)}</dd>
              </div>
              <div>
                <dt>CPF</dt>
                <dd>{data.cpf ? formatCPF(data.cpf) : 'Não informado'}</dd>
              </div>
              <div>
                <dt>Cadastrado em</dt>
                <dd>{formatDateLocal(data.created_at)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="card" aria-labelledby="patient-history">
          <div className="card-header">
            <div>
              <h2 id="patient-history" className="card-title">
                Histórico de atendimentos
              </h2>
              <p className="card-subtitle">Do mais recente para o mais antigo</p>
            </div>
          </div>
          <div className="card-body">
            {history.loading && !history.data ? (
              <div style={{ display: 'grid', gap: 16 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} height={42} />
                ))}
              </div>
            ) : history.error ? (
              <ErrorState message={history.error} onRetry={history.reload} />
            ) : !history.data?.length ? (
              <EmptyState icon={<CalendarCheck />} title="Nenhum atendimento" description="Este paciente ainda não possui atendimentos registrados." />
            ) : (
              <ol className="timeline" style={{ listStyle: 'none', margin: 0 }}>
                {history.data.map((attendance) => {
                  const status = getStatus(attendance);
                  return (
                    <li key={attendance.id} className="timeline-item" style={{ ['--dot' as string]: dotColor[status] }}>
                      <div className="timeline-item-head">
                        <strong>{formatDateTime(attendance.start_date)}</strong>
                        <StatusBadge status={status} />
                      </div>
                      <small>
                        {attendance.user?.name} · {attendance.place?.name}
                      </small>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      </div>

      <PatientFormModal
        open={editing}
        patient={data}
        companyId={companyId}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          patient.setData(() => saved);
        }}
      />
    </>
  );
}
