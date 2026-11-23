import { motion } from 'motion/react';
import { CalendarCheck, CalendarClock, CircleCheck, Stethoscope, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorState, PageHeader, Segmented, Skeleton, StatCard, StatusBadge } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { useDashboard } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buildSeries, getPeriodRange, percent, PeriodKey, PERIODS, sumValues } from '../lib/dashboard';
import { formatNumber, formatTime } from '../lib/format';

const STATUS_META = [
  { key: 'finished', label: 'Finalizados', color: 'var(--chart-1)' },
  { key: 'confirmed', label: 'Confirmados', color: 'var(--chart-3)' },
  { key: 'scheduled', label: 'Agendados', color: 'var(--chart-2)' },
] as const;

const grid = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

interface TooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ name: string; value: number; color: string }>;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.name} className="row">
          <span className="legend-swatch" style={{ background: item.color }} />
          {item.name}: <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando indicadores">
      <div className="stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card stat-card">
            <Skeleton width={42} height={42} radius={12} />
            <Skeleton width="50%" />
            <Skeleton width="40%" height={30} />
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="card card-body">
          <Skeleton height={300} radius={12} />
        </div>
        <div className="card card-body">
          <Skeleton height={300} radius={12} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle('Visão geral');
  const { user, companyId, company } = useSession();
  const [period, setPeriod] = useState<PeriodKey>('90d');
  const range = useMemo(() => getPeriodRange(period), [period]);
  const { data, loading, error, reload } = useDashboard(companyId, range);

  const series = useMemo(
    () => (data ? buildSeries(data.details.attendances_by_day, data.details.patients_by_day, range.start_date, range.end_date) : []),
    [data, range],
  );

  const firstName = user.name.replace(/^(Dra?\.)\s+/i, '').split(' ')[0];

  if (loading && !data) {
    return (
      <>
        <PageHeader eyebrow={company?.name} title={`Olá, ${firstName}`} description="Acompanhe a operação da clínica em tempo real." />
        <DashboardSkeleton />
      </>
    );
  }

  if (error && !data) {
    return (
      <div className="card">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return null;

  const periodAttendances = sumValues(data.details.attendances_by_day);
  const periodPatients = sumValues(data.details.patients_by_day);
  const statusTotal = data.attendancesByStatus.scheduled + data.attendancesByStatus.confirmed + data.attendancesByStatus.finished;
  const completion = percent(data.attendancesByStatus.finished, statusTotal);
  const maxPlace = Math.max(1, ...data.attendancesByPlace.map((p) => p.count));
  const maxPro = Math.max(1, ...data.attendancesByProfessional.map((p) => p.count));

  return (
    <>
      <PageHeader
        eyebrow={company?.name}
        title={`Olá, ${firstName}`}
        description="Acompanhe a operação da clínica: volume de atendimentos, novos pacientes e a agenda dos próximos dias."
        actions={<Segmented label="Período" options={PERIODS.map(({ value, label }) => ({ value, label }))} value={period} onChange={setPeriod} />}
      />

      <motion.div className="stats-grid" variants={grid} initial="hidden" animate="show" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 200ms' }}>
        <motion.div variants={rise}>
          <StatCard
            label="Atendimentos no período"
            value={formatNumber(periodAttendances)}
            icon={<CalendarCheck />}
            tone="primary"
            footnote={`${formatNumber(data.totalAttendances)} no total`}
          />
        </motion.div>
        <motion.div variants={rise}>
          <StatCard
            label="Novos pacientes"
            value={formatNumber(periodPatients)}
            icon={<UserPlus />}
            tone="accent"
            footnote={`${formatNumber(data.totalPatients)} pacientes cadastrados`}
          />
        </motion.div>
        <motion.div variants={rise}>
          <StatCard
            label="Taxa de conclusão"
            value={`${completion}%`}
            icon={<CircleCheck />}
            tone="success"
            footnote={`${formatNumber(data.attendancesByStatus.finished)} finalizados no período`}
          />
        </motion.div>
        <motion.div variants={rise}>
          <StatCard
            label="Próximos atendimentos"
            value={formatNumber(data.upcomingAttendances.length)}
            icon={<CalendarClock />}
            tone="warning"
            footnote={`${data.totalPlaces} locais e ${data.totalUsers} usuários`}
          />
        </motion.div>
      </motion.div>

      <motion.div className="dashboard-grid" variants={grid} initial="hidden" animate="show">
        <motion.section variants={rise} className="card" aria-labelledby="chart-volume">
          <div className="card-header">
            <div>
              <h2 id="chart-volume" className="card-title">
                Volume de atendimentos
              </h2>
              <p className="card-subtitle">Atendimentos e novos pacientes no período selecionado</p>
            </div>
          </div>
          <div className="card-body">
            {periodAttendances + periodPatients === 0 ? (
              <EmptyState title="Sem movimento no período" description="Altere o período para ver a evolução dos atendimentos." />
            ) : (
              <div className="chart-box" role="img" aria-label={`Gráfico com ${periodAttendances} atendimentos e ${periodPatients} novos pacientes no período`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 6" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} minTickGap={16} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-border-strong)' }} />
                    <Area
                      type="monotone"
                      name="Atendimentos"
                      dataKey="attendances"
                      stroke="var(--chart-1)"
                      strokeWidth={2.5}
                      fill="url(#gradA)"
                      animationDuration={700}
                    />
                    <Area
                      type="monotone"
                      name="Novos pacientes"
                      dataKey="patients"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      fill="url(#gradP)"
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section variants={rise} className="card" aria-labelledby="chart-status">
          <div className="card-header">
            <div>
              <h2 id="chart-status" className="card-title">
                Status da agenda
              </h2>
              <p className="card-subtitle">Distribuição no período</p>
            </div>
          </div>
          <div className="card-body">
            {statusTotal === 0 ? (
              <EmptyState title="Nenhum atendimento" />
            ) : (
              <>
                <div className="donut-wrap chart-box chart-box-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={STATUS_META.map((s) => ({ name: s.label, value: data.attendancesByStatus[s.key] }))}
                        dataKey="value"
                        innerRadius="68%"
                        outerRadius="92%"
                        paddingAngle={3}
                        stroke="none"
                        animationDuration={700}
                      >
                        {STATUS_META.map((s) => (
                          <Cell key={s.key} fill={s.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <strong>{formatNumber(statusTotal)}</strong>
                    <small>atendimentos</small>
                  </div>
                </div>
                <ul className="legend" style={{ listStyle: 'none', padding: 0 }}>
                  {STATUS_META.map((s) => (
                    <li key={s.key} className="legend-item">
                      <span className="legend-swatch" style={{ background: s.color }} />
                      {s.label}
                      <strong>{formatNumber(data.attendancesByStatus[s.key])}</strong>
                      <small>{percent(data.attendancesByStatus[s.key], statusTotal)}%</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </motion.section>

        <motion.section variants={rise} className="card" aria-labelledby="upcoming-title">
          <div className="card-header">
            <div>
              <h2 id="upcoming-title" className="card-title">
                Próximos atendimentos
              </h2>
              <p className="card-subtitle">Agenda a partir de agora</p>
            </div>
            <Link to="/attendances" className="btn btn-ghost btn-sm">
              Ver agenda
            </Link>
          </div>
          <div className="card-body">
            {data.upcomingAttendances.length === 0 ? (
              <EmptyState icon={<CalendarClock />} title="Agenda livre" description="Nenhum atendimento futuro agendado." />
            ) : (
              <ul className="upcoming-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.upcomingAttendances.map((attendance) => {
                  const date = new Date(attendance.start_date);
                  return (
                    <li key={attendance.id} className="upcoming-item">
                      <span className="date-tile" aria-hidden>
                        <small>{monthShort.format(date).replace('.', '')}</small>
                        <strong>{date.getDate()}</strong>
                      </span>
                      <div className="upcoming-info">
                        <strong>{attendance.patient?.name}</strong>
                        <small>
                          {weekday.format(date).replace('.', '')}, {formatTime(attendance.start_date)} · {attendance.user?.name} · {attendance.place?.name}
                        </small>
                      </div>
                      {attendance.status && <StatusBadge status={attendance.status} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.section>

        <motion.section variants={rise} className="card" aria-labelledby="ranking-title">
          <div className="card-header">
            <div>
              <h2 id="ranking-title" className="card-title">
                Uso dos locais
              </h2>
              <p className="card-subtitle">Atendimentos por sala no período</p>
            </div>
          </div>
          <div className="card-body">
            {data.attendancesByPlace.length === 0 ? (
              <EmptyState title="Sem dados no período" />
            ) : (
              <ul className="rank-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.attendancesByPlace.map((place) => (
                  <li key={place.name}>
                    <div className="rank-item-head">
                      <span>{place.name}</span>
                      <strong>{place.count}</strong>
                    </div>
                    <div className="progress">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${(place.count / maxPlace) * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.section>

        <motion.section variants={rise} className="card span-full" aria-labelledby="pros-title">
          <div className="card-header">
            <div>
              <h2 id="pros-title" className="card-title">
                Profissionais com mais atendimentos
              </h2>
              <p className="card-subtitle">Top 5 no período</p>
            </div>
            <Link to="/reports" className="btn btn-ghost btn-sm">
              Relatório completo
            </Link>
          </div>
          <div className="card-body">
            {data.attendancesByProfessional.length === 0 ? (
              <EmptyState icon={<Stethoscope />} title="Sem atendimentos no período" />
            ) : (
              <ul
                className="rank-list"
                style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}
              >
                {data.attendancesByProfessional.map((pro) => (
                  <li key={pro.name}>
                    <div className="rank-item-head">
                      <span>{pro.name}</span>
                      <strong>{pro.count}</strong>
                    </div>
                    <div className="progress">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${(pro.count / maxPro) * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.section>
      </motion.div>
    </>
  );
}
