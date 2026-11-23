import { motion } from 'motion/react';
import { ChartColumn, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, Button, EmptyState, ErrorState, Field, PageHeader, Segmented, TableSkeleton } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { useReports } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { percent } from '../lib/dashboard';
import { getRoleLabel } from '../lib/permissions';
import { toCsv } from '../lib/report';

type RoleFilter = 'DOCTOR' | 'RECEPTIONIST' | 'ALL';

export default function Reports() {
  useDocumentTitle('Relatórios');
  const { companyId, company } = useSession();
  const [role, setRole] = useState<RoleFilter>('DOCTOR');
  const [range, setRange] = useState({ start_date: '', end_date: '' });
  const invalidRange = Boolean(range.start_date && range.end_date && range.end_date < range.start_date);
  const params = useMemo(
    () => ({ company_id: companyId, role, ...(invalidRange ? {} : Object.fromEntries(Object.entries(range).filter(([, v]) => v))) }),
    [companyId, role, range, invalidRange],
  );
  const { data, loading, error, reload } = useReports(companyId, params);

  const total = (data ?? []).reduce((acc, row) => acc + row.total_attendances, 0);
  const max = Math.max(1, ...(data ?? []).map((row) => row.total_attendances));

  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob([`\ufeff${toCsv(data)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-atendimentos-${company?.name.toLowerCase().replace(/\s+/g, '-') ?? 'clinica'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="Indicadores"
        title="Relatório de produtividade"
        description="Médicos são contabilizados pelos atendimentos realizados; a recepção, pelos agendamentos que registrou."
        actions={
          <Button icon={<Download />} onClick={exportCsv} disabled={!data?.length}>
            Exportar CSV
          </Button>
        }
      />

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ alignItems: 'flex-end', borderBottom: 'none' }}>
          <div className="field">
            <span className="field-label">Perfil</span>
            <Segmented
              label="Perfil"
              value={role}
              onChange={setRole}
              options={[
                { value: 'DOCTOR', label: 'Médicos' },
                { value: 'RECEPTIONIST', label: 'Recepção' },
                { value: 'ALL', label: 'Todos' },
              ]}
            />
          </div>
          <Field label="De" optional>
            <input className="input" type="date" value={range.start_date} onChange={(e) => setRange({ ...range, start_date: e.target.value })} />
          </Field>
          <Field label="Até" optional error={invalidRange ? 'A data final deve ser posterior à inicial.' : undefined}>
            <input className="input" type="date" value={range.end_date} onChange={(e) => setRange({ ...range, end_date: e.target.value })} />
          </Field>
          {(range.start_date || range.end_date) && (
            <Button variant="ghost" onClick={() => setRange({ start_date: '', end_date: '' })}>
              Limpar período
            </Button>
          )}
        </div>
      </section>

      {loading && !data ? (
        <div className="card">
          <TableSkeleton columns={4} />
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data?.length ? (
        <div className="card">
          <EmptyState icon={<ChartColumn />} title="Sem dados para este filtro" description="Nenhum profissional com o perfil selecionado." />
        </div>
      ) : (
        <div className="dashboard-grid" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 200ms' }}>
          <section className="card" aria-labelledby="report-chart">
            <div className="card-header">
              <div>
                <h2 id="report-chart" className="card-title">
                  Atendimentos por profissional
                </h2>
                <p className="card-subtitle">{total} atendimentos no total</p>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-box" role="img" aria-label="Gráfico de barras com atendimentos por profissional">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 6" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      interval={0}
                      tickFormatter={(v: string) => v.split(' ').slice(0, 2).join(' ')}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-surface-hover)' }}
                      contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                    <Bar dataKey="total_attendances" name="Atendimentos" fill="var(--chart-1)" radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={700} />
                    <Bar
                      dataKey="finished_attendances"
                      name="Finalizados"
                      fill="var(--chart-2)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={56}
                      animationDuration={700}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="report-table">
            <div className="card-header">
              <h2 id="report-table" className="card-title">
                Ranking
              </h2>
            </div>
            <div className="card-body">
              <ol className="rank-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.map((row, index) => (
                  <li key={row.id}>
                    <div className="rank-item-head" style={{ alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="muted tabular" style={{ width: 18 }}>
                          {index + 1}
                        </span>
                        <Avatar name={row.name} size="sm" />
                        <span>
                          <span className="cell-title">{row.name}</span>
                          <br />
                          <small className="muted">
                            {getRoleLabel({ role: row.role, root: false })} · {percent(row.finished_attendances, row.total_attendances)}% finalizados
                          </small>
                        </span>
                      </span>
                      <strong>{row.total_attendances}</strong>
                    </div>
                    <div className="progress">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${(row.total_attendances / max) * 100}%` }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
