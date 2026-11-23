import { FormEvent, useState } from 'react';
import { Button, Field, Modal, PasswordInput } from '../components/ui';
import { useResetOnOpen } from '../hooks/useResetOnOpen';
import { useToast } from '../context/ToastContext';
import { api, getErrorMessage, getFieldErrors } from '../lib/api';
import { formatCPF, formatPhone } from '../lib/format';
import { isValidCPF, isValidEmail, required } from '../lib/validators';
import { User, UserRole } from '../types';

interface Props {
  open: boolean;
  user?: User | null;
  companyId: number;
  onClose: () => void;
  onSaved: (user: User) => void;
}

const empty = { name: '', email: '', login: '', password: '', cpf: '', phone: '', role: 'DOCTOR' as UserRole, root: false };

export function UserFormModal({ open, user, companyId, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useResetOnOpen(open, user?.id, () => {
    setErrors({});
    setForm(user ? { ...empty, ...user, phone: formatPhone(user.phone), cpf: formatCPF(user.cpf), password: '' } : empty);
  });

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const validate = () => {
    const next: Record<string, string> = {};
    const nameError = required(form.name, 'Informe o nome.');
    if (nameError) next.name = nameError;
    if (!isValidEmail(form.email)) next.email = 'Informe um email válido.';
    if (form.login.trim().length < 3) next.login = 'O login deve ter ao menos 3 caracteres.';
    if (!isValidCPF(form.cpf)) next.cpf = 'CPF inválido.';
    if (!user && form.password.length < 6) next.password = 'A senha deve ter ao menos 6 caracteres.';
    if (user && form.password && form.password.length < 6) next.password = 'A senha deve ter ao menos 6 caracteres.';
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = { ...form, company_id: user?.company_id ?? companyId };
      const { data } = user ? await api.put<User>(`/users/${user.id}`, payload) : await api.post<User>('/users', payload);
      toast.success(user ? 'Usuário atualizado.' : 'Usuário cadastrado.');
      onSaved(data);
    } catch (error) {
      setErrors(getFieldErrors(error));
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={user ? 'Editar usuário' : 'Novo usuário'}
      description="Dados de acesso e perfil do membro da equipe."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="user-form" loading={saving}>
            {user ? 'Salvar alterações' : 'Cadastrar usuário'}
          </Button>
        </>
      }
    >
      <form id="user-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Nome completo" error={errors.name} className="span-2">
          <input className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="off" />
        </Field>
        <Field label="Login" error={errors.login}>
          <input className="input" value={form.login} onChange={set('login')} autoComplete="off" />
        </Field>
        <Field label="CPF" error={errors.cpf}>
          <input
            className="input"
            inputMode="numeric"
            value={form.cpf}
            onChange={(e) => {
              const value = formatCPF(e.target.value);
              setForm((current) => ({ ...current, cpf: value }));
            }}
            placeholder="000.000.000-00"
          />
        </Field>
        <Field label="Telefone" optional error={errors.phone}>
          <input
            className="input"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => {
              const value = formatPhone(e.target.value);
              setForm((current) => ({ ...current, phone: value }));
            }}
            placeholder="(81) 90000-0000"
          />
        </Field>
        <Field label="Perfil" error={errors.role}>
          <select className="select" value={form.role} onChange={set('role')}>
            <option value="DOCTOR">Médico(a)</option>
            <option value="RECEPTIONIST">Recepção</option>
            <option value="GUEST">Visitante (somente leitura)</option>
          </select>
        </Field>
        <Field
          label={user ? 'Nova senha' : 'Senha'}
          optional={Boolean(user)}
          error={errors.password}
          hint={user ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres.'}
        >
          <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <label className="span-2" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)' }}>
          <input
            type="checkbox"
            checked={form.root}
            onChange={(e) => {
              const value = e.target.checked;
              setForm((current) => ({ ...current, root: value }));
            }}
          />
          Administrador (pode gerenciar clínicas e equipe)
        </label>
      </form>
    </Modal>
  );
}
