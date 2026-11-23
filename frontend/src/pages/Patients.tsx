import { motion } from 'motion/react';
import { Eye, Pencil, Plus, Search, Stethoscope, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, PaginationBar, TableSkeleton } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PatientFormModal } from '../features/PatientFormModal';
import { ReadOnlyBanner } from '../features/ReadOnlyBanner';
import { usePatients } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePagination } from '../hooks/usePagination';
import { useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../lib/api';
import { invalidateAfterPatientChange, removePatientFromCache, upsertPatientInCache } from '../lib/queryApi';
import { calculateAge, formatCPF, formatDate, formatDateLocal } from '../lib/format';
import { canWrite } from '../lib/permissions';
import { normalizeText } from '../lib/text';
import { Patient } from '../types';

export default function Patients() {
  useDocumentTitle('Pacientes');
  const { user, companyId } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = usePatients(companyId);
  const queryClient = useQueryClient();
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

  const pagination = usePagination(filtered, query);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/patients/${deleting.id}`);
      removePatientFromCache(queryClient, companyId, deleting.id);
      invalidateAfterPatientChange(queryClient);
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
          <>
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
                  {pagination.items.map((patient, index) => (
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
            <PaginationBar
              page={pagination.page}
              pageSize={pagination.pageSize}
              pageCount={pagination.pageCount}
              total={pagination.total}
              start={pagination.start}
              end={pagination.end}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        )}
      </section>

      <PatientFormModal
        open={formOpen}
        patient={editing}
        companyId={companyId}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false);
          upsertPatientInCache(queryClient, companyId, saved);
          invalidateAfterPatientChange(queryClient);
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
