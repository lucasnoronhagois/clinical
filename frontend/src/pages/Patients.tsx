import { motion } from 'motion/react';
import { Eye, Pencil, Plus, Search, Stethoscope, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, TableSkeleton } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PatientFormModal } from '../features/PatientFormModal';
import { ReadOnlyBanner } from '../features/ReadOnlyBanner';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, getErrorMessage } from '../lib/api';
import { calculateAge, formatCPF, formatDate, formatDateLocal } from '../lib/format';
import { canWrite } from '../lib/permissions';
import { normalizeText } from '../lib/text';
import { Patient } from '../types';

export default function Patients() {
  useDocumentTitle('Pacientes');
  const { user, companyId } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<Patient[]>('/patients', { company_id: companyId });
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [busy, setBusy] = useState(false);
  const writable = canWrite(user);

  const filtered = useMemo(() => {
    const term = normalizeText(query);
    const digits = query.replace(/\D/g, '');
    if (!term) return data ?? [];
    return (data ?? []).filter((p) => normalizeText(p.name).includes(term) || (digits.length > 0 && p.cpf?.includes(digits)));
  }, [data, query]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/patients/${deleting.id}`);
      setData((current) => current?.filter((p) => p.id !== deleting.id) ?? null);
      toast.success('Paciente excluído.');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Pacientes"
        description="Consulte, cadastre e mantenha atualizados os dados dos pacientes da clínica."
        actions={
          writable && (
            <Button
              variant="primary"
              icon={<Plus />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Novo paciente
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
              placeholder="Buscar por nome ou CPF"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar pacientes"
            />
          </div>
          <span className="toolbar-spacer" />
          {data && (
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {filtered.length} de {data.length} pacientes
            </span>
          )}
        </div>

        {loading && !data ? (
          <TableSkeleton columns={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Stethoscope />}
            title={query ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            description={query ? 'Tente buscar por outro nome ou CPF.' : 'Cadastre o primeiro paciente para começar a agendar atendimentos.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th scope="col">Paciente</th>
                  <th scope="col">CPF</th>
                  <th scope="col">Nascimento</th>
                  <th scope="col">Cadastro</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient, index) => (
                  <motion.tr
                    key={patient.id}
                    className="row-link"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.015, 0.3) }}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <td data-label="Paciente">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={patient.name} size="sm" />
                        <div>
                          <div className="cell-title">{patient.name}</div>
                          <div className="cell-sub">{calculateAge(patient.birth_date)} anos</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="CPF" className="tabular">
                      {patient.cpf ? formatCPF(patient.cpf) : <span className="muted">Não informado</span>}
                    </td>
                    <td data-label="Nascimento" className="tabular">
                      {formatDate(patient.birth_date)}
                    </td>
                    <td data-label="Cadastro" className="tabular">
                      {formatDateLocal(patient.created_at)}
                    </td>
                    <td data-label="" onClick={(e) => e.stopPropagation()}>
                      <div className="actions">
                        <Button
                          size="sm"
                          variant="ghost"
                          iconOnly
                          icon={<Eye />}
                          aria-label={`Ver ${patient.name}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        />
                        {writable && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={<Pencil />}
                              aria-label={`Editar ${patient.name}`}
                              onClick={() => {
                                setEditing(patient);
                                setFormOpen(true);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={<Trash2 />}
                              aria-label={`Excluir ${patient.name}`}
                              onClick={() => setDeleting(patient)}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PatientFormModal
        open={formOpen}
        patient={editing}
        companyId={companyId}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false);
          setData((current) => [...(current?.filter((p) => p.id !== saved.id) ?? []), saved].sort((a, b) => a.name.localeCompare(b.name)));
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir paciente?"
        description={`${deleting?.name ?? ''} será removido da lista de pacientes. O histórico de atendimentos é preservado.`}
        confirmLabel="Excluir paciente"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
