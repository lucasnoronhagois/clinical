import { FormEvent, useState } from 'react';
import { Button, Field, Modal } from '../components/ui';
import { useResetOnOpen } from '../hooks/useResetOnOpen';
import { useToast } from '../context/ToastContext';
import { api, getErrorMessage, getFieldErrors } from '../lib/api';
import { toDateTimeLocalInput } from '../lib/format';
import { Attendance, Patient, Place, User } from '../types';

interface Props {
  open: boolean;
  attendance?: Attendance | null;
  companyId: number;
  patients: Patient[];
  places: Place[];
  doctors: User[];
  defaultPatientId?: number;
  onClose: () => void;
  onSaved: (attendance: Attendance) => void;
}

const nextSlot = () => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toDateTimeLocalInput(date);
};

export function AttendanceFormModal({ open, attendance, companyId, patients, places, doctors, defaultPatientId, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({ patient_id: '', user_id: '', place_id: '', start_date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useResetOnOpen(open, attendance?.id ?? `new-${defaultPatientId ?? ''}`, () => {
    setErrors({});
    setForm(
      attendance
        ? {
            patient_id: String(attendance.patient_id),
            user_id: String(attendance.user_id),
            place_id: String(attendance.place_id),
            start_date: toDateTimeLocalInput(attendance.start_date),
          }
        : { patient_id: defaultPatientId ? String(defaultPatientId) : '', user_id: '', place_id: '', start_date: nextSlot() },
    );
  });

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.patient_id) next.patient_id = 'Selecione o paciente.';
    if (!form.user_id) next.user_id = 'Selecione o profissional.';
    if (!form.place_id) next.place_id = 'Selecione o local.';
    if (!form.start_date) next.start_date = 'Informe data e horário.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        patient_id: Number(form.patient_id),
        user_id: Number(form.user_id),
        place_id: Number(form.place_id),
        start_date: new Date(form.start_date).toISOString(),
      };
      const { data } = attendance ? await api.put<Attendance>(`/attendances/${attendance.id}`, payload) : await api.post<Attendance>('/attendances', payload);
      toast.success(attendance ? 'Atendimento atualizado.' : 'Atendimento agendado.');
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
      title={attendance ? 'Editar atendimento' : 'Novo atendimento'}
      description="Defina paciente, profissional, local e horário."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="attendance-form" loading={saving}>
            {attendance ? 'Salvar alterações' : 'Agendar'}
          </Button>
        </>
      }
    >
      <form id="attendance-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Paciente" error={errors.patient_id} className="span-2">
          <select className="select" value={form.patient_id} onChange={set('patient_id')}>
            <option value="">Selecione um paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profissional" error={errors.user_id}>
          <select className="select" value={form.user_id} onChange={set('user_id')}>
            <option value="">Selecione</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Local" error={errors.place_id}>
          <select className="select" value={form.place_id} onChange={set('place_id')}>
            <option value="">Selecione</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data e horário" error={errors.start_date} className="span-2">
          <input className="input" type="datetime-local" value={form.start_date} onChange={set('start_date')} />
        </Field>
      </form>
    </Modal>
  );
}
