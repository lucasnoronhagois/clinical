import { motion } from 'motion/react';
import { Building2, ChevronRight, LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Brand } from '../components/layout/Brand';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CompanyFormModal } from '../features/CompanyFormModal';
import { useCompanies } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useQueryClient } from '@tanstack/react-query';
import { removeCompanyFromCache, upsertCompanyInCache } from '../lib/queryApi';
import { api, getErrorMessage } from '../lib/api';
import { formatCEP } from '../lib/format';
import { canSwitchCompany, getRoleLabel, isAdmin } from '../lib/permissions';
import { Company } from '../types';

const list = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const card = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } } };

export default function SelectCompany() {
  useDocumentTitle('Selecionar clínica');
  const { user, selectCompany, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, loading, error, reload } = useCompanies(Boolean(user));
  const [editing, setEditing] = useState<Company | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Company | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!canSwitchCompany(user)) return <Navigate to="/dashboard" replace />;

  const admin = isAdmin(user);

  const enter = (company: Company) => {
    selectCompany(company);
    navigate('/dashboard');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/companies/${deleting.id}`);
      removeCompanyFromCache(queryClient, deleting.id);
      toast.success('Clínica excluída.');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="topbar">
        <Brand to="/select-company" />
        <div className="topbar-actions">
          <ThemeToggle />
          <Button variant="ghost" icon={<LogOut />} onClick={logout}>
            Sair
          </Button>
        </div>
      </header>
      <main className="content" id="main-content">
        <PageHeader
          eyebrow={`Olá, ${user.name.split(' ')[0]} · ${getRoleLabel(user)}`}
          title="Escolha uma clínica"
          description={
            admin
              ? 'Selecione a unidade que deseja gerenciar ou cadastre uma nova.'
              : 'Selecione a unidade que deseja visualizar. O perfil visitante tem acesso somente leitura.'
          }
          actions={
            admin && (
              <Button
                variant="primary"
                icon={<Plus />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Nova clínica
              </Button>
            )
          }
        />

        {loading && !data ? (
          <div className="company-grid" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card company-card">
                <Skeleton width={44} height={44} radius={12} />
                <Skeleton width="70%" height={16} />
                <Skeleton width="90%" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : !data?.length ? (
          <div className="card">
            <EmptyState
              icon={<Building2 />}
              title="Nenhuma clínica cadastrada"
              description={admin ? 'Cadastre a primeira unidade para começar.' : 'Peça a um administrador para cadastrar uma clínica.'}
            />
          </div>
        ) : (
          <motion.div className="company-grid" variants={list} initial="hidden" animate="show">
            {data.map((company) => (
              <motion.div key={company.id} variants={card} layout>
                <div
                  className="card card-interactive company-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => enter(company)}
                  onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), enter(company))}
                  aria-label={`Entrar na ${company.name}`}
                >
                  <div className="company-card-head">
                    <span className="company-card-icon" aria-hidden>
                      <Building2 />
                    </span>
                    <div>
                      <h3>{company.name}</h3>
                      <small className="muted">{company.email}</small>
                    </div>
                  </div>
                  <address>
                    {company.adress_street}, {company.adress_number}
                    {company.adress_complement ? `, ${company.adress_complement}` : ''}
                    <br />
                    {company.adress_neighborhood}, {company.adress_city}/{company.adress_state}
                    <br />
                    CEP {formatCEP(company.zip_code)}
                  </address>
                  <div className="company-card-footer">
                    <span className="enter">
                      Acessar painel <ChevronRight size={16} aria-hidden />
                    </span>
                    {admin && (
                      <span style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          iconOnly
                          icon={<Pencil />}
                          aria-label={`Editar ${company.name}`}
                          onClick={() => {
                            setEditing(company);
                            setFormOpen(true);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          iconOnly
                          icon={<Trash2 />}
                          aria-label={`Excluir ${company.name}`}
                          onClick={() => setDeleting(company)}
                        />
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      <CompanyFormModal
        open={formOpen}
        company={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false);
          upsertCompanyInCache(queryClient, saved);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir clínica?"
        description={`A clínica "${deleting?.name ?? ''}" deixará de aparecer no sistema. Os registros são mantidos para auditoria.`}
        confirmLabel="Excluir clínica"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
