import { FormEvent, useState } from 'react';
import { Button, Field, Modal } from '../components/ui';
import { useResetOnOpen } from '../hooks/useResetOnOpen';
import { useToast } from '../context/ToastContext';
import { api, getErrorMessage, getFieldErrors } from '../lib/api';
import { formatCPF, toDateInput } from '../lib/format';
import { isValidCPF, required } from '../lib/validators';
import { Patient } from '../types';

interface Props {
  open: boolean;
  patient?: Patient | null;
  companyId: number;
  onClose: () => void;
  onSaved: (patient: Patient) => void;
}

export function PatientFormModal({ open, patient, companyId, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', cpf: '', birth_date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useResetOnOpen(open, patient?.id, () => {
    setErrors({});
    setForm(patient ? { name: patient.name, cpf: formatCPF(patient.cpf), birth_date: toDateInput(patient.birth_date) } : { name: '', cpf: '', birth_date: '' });
  });

  const validate = () => {
    const next: Record<string, string> = {};
    const nameError = required(form.name, 'Informe o nome do paciente.');
    if (nameError) next.name = nameError;
    else if (form.name.trim().length < 3) next.name = 'O nome deve ter ao menos 3 caracteres.';
    if (form.cpf && !isValidCPF(form.cpf)) next.cpf = 'CPF inválido.';
    if (!form.birth_date) next.birth_date = 'Informe a data de nascimento.';
    else if (new Date(form.birth_date) > new Date()) next.birth_date = 'A data não pode estar no futuro.';
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), company_id: companyId };
      const { data } = patient ? await api.put<Patient>(`/patients/${patient.id}`, payload) : await api.post<Patient>('/patients', payload);
      toast.success(patient ? 'Paciente atualizado.' : 'Paciente cadastrado.');
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
      title={patient ? 'Editar paciente' : 'Novo paciente'}
      description="Dados de identificação do paciente."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="patient-form" loading={saving}>
            {patient ? 'Salvar alterações' : 'Cadastrar paciente'}
          </Button>
        </>
      }
    >
      <form id="patient-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Nome completo" error={errors.name} className="span-2">
          <input
            className="input"
            value={form.name}
            onChange={(e) => {
              const value = e.target.value;
              setForm((current) => ({ ...current, name: value }));
            }}
            autoComplete="off"
          />
        </Field>
        <Field label="CPF" optional error={errors.cpf}>
          <input
            className="input"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => {
              const value = formatCPF(e.target.value);
              setForm((current) => ({ ...current, cpf: value }));
            }}
          />
        </Field>
        <Field label="Data de nascimento" error={errors.birth_date}>
          <input
            className="input"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.birth_date}
            onChange={(e) => {
              const value = e.target.value;
              setForm((current) => ({ ...current, birth_date: value }));
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}
