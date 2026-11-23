import { Pencil, Search, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar, Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, TableSkeleton } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserFormModal } from '../features/UserFormModal';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, getErrorMessage } from '../lib/api';
import { formatPhone } from '../lib/format';
import { getRoleLabel } from '../lib/permissions';
import { normalizeText } from '../lib/text';
import { User, UserRole } from '../types';

const roleTone: Record<UserRole, string> = { DOCTOR: 'badge-primary', RECEPTIONIST: 'badge-accent', GUEST: '' };

export default function Users() {
  useDocumentTitle('Equipe');
  const { user: me, companyId } = useSession();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<{ users: User[] }>('/users', { company_id: companyId });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const users = useMemo(() => {
    const term = normalizeText(query);
    return (data?.users ?? []).filter(
      (u) =>
        (!role || u.role === role) &&
        (!term || normalizeText(u.name).includes(term) || normalizeText(u.email).includes(term) || normalizeText(u.login).includes(term)),
    );
  }, [data, query, role]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/users/${deleting.id}`);
      setData((current) => (current ? { users: current.users.filter((u) => u.id !== deleting.id) } : current));
      toast.success('Usuário excluído.');
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
        eyebrow="Administração"
        title="Equipe"
        description="Gerencie quem acessa o sistema e com qual perfil."
        actions={
          <Button
            variant="primary"
            icon={<UserPlus />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Novo usuário
          </Button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <div className="input-icon">
            <Search aria-hidden />
            <input
              className="input"
              type="search"
              placeholder="Buscar por nome, email ou login"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar usuários"
            />
          </div>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filtrar por perfil">
            <option value="">Todos os perfis</option>
            <option value="DOCTOR">Médicos</option>
            <option value="RECEPTIONIST">Recepção</option>
            <option value="GUEST">Visitantes</option>
          </select>
        </div>

        {loading && !data ? (
          <TableSkeleton columns={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : users.length === 0 ? (
          <EmptyState icon={<UsersIcon />} title="Nenhum usuário encontrado" description="Ajuste a busca ou cadastre um novo membro." />
        ) : (
          <div className="table-wrap">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Login</th>
                  <th scope="col">Telefone</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Nome">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <div className="cell-title">
                            {u.name} {u.id === me.id && <span className="badge">Você</span>}
                          </div>
                          <div className="cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Login">{u.login}</td>
                    <td data-label="Telefone" className="tabular">
                      {u.phone ? formatPhone(u.phone) : <span className="muted">Não informado</span>}
                    </td>
                    <td data-label="Perfil">
                      <span className={`badge ${u.root ? 'badge-warning' : roleTone[u.role]}`}>{getRoleLabel(u)}</span>
                    </td>
                    <td data-label="">
                      <div className="actions">
                        <Button
                          size="sm"
                          variant="ghost"
                          iconOnly
                          icon={<Pencil />}
                          aria-label={`Editar ${u.name}`}
                          onClick={() => {
                            setEditing(u);
                            setFormOpen(true);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          iconOnly
                          icon={<Trash2 />}
                          aria-label={`Excluir ${u.name}`}
                          disabled={u.id === me.id}
                          onClick={() => setDeleting(u)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <UserFormModal
        open={formOpen}
        user={editing}
        companyId={companyId}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false);
          setData((current) => ({ users: [...(current?.users.filter((u) => u.id !== saved.id) ?? []), saved].sort((a, b) => a.name.localeCompare(b.name)) }));
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir usuário?"
        description={`${deleting?.name ?? ''} perderá o acesso ao sistema.`}
        confirmLabel="Excluir usuário"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
