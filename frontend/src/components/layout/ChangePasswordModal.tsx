import { FormEvent, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { api, getErrorMessage } from '../../lib/api';
import { Button, Field, Modal } from '../ui';

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const close = () => {
    setForm({ currentPassword: '', newPassword: '', confirm: '' });
    setErrors({});
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.currentPassword) next.currentPassword = 'Informe a senha atual.';
    if (form.newPassword.length < 6) next.newPassword = 'A nova senha precisa ter ao menos 6 caracteres.';
    if (form.confirm !== form.newPassword) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Senha alterada com sucesso.');
      close();
    } catch (error) {
      setErrors({ currentPassword: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Alterar senha"
      description="Use pelo menos 6 caracteres."
      size="sm"
      footer={
        <>
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" type="submit" form="change-password-form" loading={saving}>
            Salvar nova senha
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={submit} className="auth-form" noValidate>
        <Field label="Senha atual" error={errors.currentPassword}>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => {
              const value = e.target.value;
              setForm((current) => ({ ...current, currentPassword: value }));
            }}
          />
        </Field>
        <Field label="Nova senha" error={errors.newPassword}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => {
              const value = e.target.value;
              setForm((current) => ({ ...current, newPassword: value }));
            }}
          />
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirm}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => {
              const value = e.target.value;
              setForm((current) => ({ ...current, confirm: value }));
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}
