import { motion } from 'motion/react';
import { DoorOpen, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton } from '../components/ui';
import { useSession } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ReadOnlyBanner } from '../features/ReadOnlyBanner';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, getErrorMessage, getFieldErrors } from '../lib/api';
import { canWrite } from '../lib/permissions';
import { Place } from '../types';

export default function Places() {
  useDocumentTitle('Locais');
  const { user, companyId } = useSession();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<Place[]>('/places', { company_id: companyId });
  const [editing, setEditing] = useState<Place | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Place | null>(null);
  const writable = canWrite(user);

  const openForm = (place: Place | null) => {
    setEditing(place);
    setName(place?.name ?? '');
    setNameError(undefined);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 3) {
      setNameError('O nome deve ter ao menos 3 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), company_id: companyId };
      const { data: saved } = editing ? await api.put<Place>(`/places/${editing.id}`, payload) : await api.post<Place>('/places', payload);
      setData((current) => [...(current?.filter((p) => p.id !== saved.id) ?? []), saved].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(editing ? 'Local atualizado.' : 'Local cadastrado.');
      setFormOpen(false);
    } catch (err) {
      setNameError(getFieldErrors(err).name ?? getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/places/${deleting.id}`);
      setData((current) => current?.filter((p) => p.id !== deleting.id) ?? null);
      toast.success('Local excluído.');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Estrutura"
        title="Locais de atendimento"
        description="Consultórios, salas de exame e demais espaços onde os atendimentos acontecem."
        actions={
          writable && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Novo local
            </Button>
          )
        }
      />
      {!writable && <ReadOnlyBanner />}

      {loading && !data ? (
        <div className="place-grid" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card place-card">
              <Skeleton width={40} height={40} radius={12} />
              <Skeleton width="60%" height={16} />
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
            icon={<MapPin />}
            title="Nenhum local cadastrado"
            description="Cadastre consultórios e salas para usar na agenda."
            action={
              writable && (
                <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
                  Cadastrar local
                </Button>
              )
            }
          />
        </div>
      ) : (
        <motion.div className="place-grid" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
          {data.map((place) => (
            <motion.article
              key={place.id}
              layout
              className="card card-interactive place-card"
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <div className="place-card-head">
                <span className="place-icon" aria-hidden>
                  <DoorOpen />
                </span>
                {writable && (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} aria-label={`Editar ${place.name}`} onClick={() => openForm(place)} />
                    <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={`Excluir ${place.name}`} onClick={() => setDeleting(place)} />
                  </span>
                )}
              </div>
              <h3>{place.name}</h3>
            </motion.article>
          ))}
        </motion.div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="sm"
        title={editing ? 'Editar local' : 'Novo local'}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" form="place-form" loading={saving}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="place-form" onSubmit={submit} noValidate>
          <Field label="Nome do local" error={nameError} hint="Ex.: Consultório 3, Sala de Exames">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir local?"
        description={`"${deleting?.name ?? ''}" deixará de aparecer na agenda.`}
        confirmLabel="Excluir local"
        loading={saving}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
