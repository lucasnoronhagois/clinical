import { FormEvent, useState } from 'react';
import { Button, Field, Modal } from '../components/ui';
import { useResetOnOpen } from '../hooks/useResetOnOpen';
import { useToast } from '../context/ToastContext';
import { api, getErrorMessage, getFieldErrors } from '../lib/api';
import { formatCEP } from '../lib/format';
import { isValidEmail, required } from '../lib/validators';
import { Company } from '../types';

const STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const empty = {
  name: '',
  email: '',
  zip_code: '',
  adress_street: '',
  adress_number: '',
  adress_complement: '',
  adress_neighborhood: '',
  adress_city: '',
  adress_state: 'PE',
};

type FormState = typeof empty;

interface Props {
  open: boolean;
  company?: Company | null;
  onClose: () => void;
  onSaved: (company: Company) => void;
}

export function CompanyFormModal({ open, company, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useResetOnOpen(open, company?.id, () => {
    setErrors({});
    setForm(company ? { ...empty, ...company, zip_code: formatCEP(company.zip_code), adress_complement: company.adress_complement ?? '' } : empty);
  });

  const set = (key: keyof FormState) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const validate = () => {
    const next: Record<string, string> = {};
    const req: Array<[keyof FormState, string]> = [
      ['name', 'Informe o nome da clínica.'],
      ['adress_street', 'Informe a rua.'],
      ['adress_number', 'Informe o número.'],
      ['adress_neighborhood', 'Informe o bairro.'],
      ['adress_city', 'Informe a cidade.'],
    ];
    req.forEach(([key, message]) => {
      const error = required(form[key], message);
      if (error) next[key] = error;
    });
    if (!isValidEmail(form.email)) next.email = 'Informe um email válido.';
    if (form.zip_code.replace(/\D/g, '').length !== 8) next.zip_code = 'O CEP deve ter 8 dígitos.';
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const { data } = company ? await api.put<Company>(`/companies/${company.id}`, form) : await api.post<Company>('/companies', form);
      toast.success(company ? 'Clínica atualizada.' : 'Clínica cadastrada.');
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
      title={company ? 'Editar clínica' : 'Nova clínica'}
      description="Dados de contato e endereço da unidade."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="company-form" loading={saving}>
            {company ? 'Salvar alterações' : 'Cadastrar clínica'}
          </Button>
        </>
      }
    >
      <form id="company-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Nome" error={errors.name} className="span-2">
          <input className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className="input" type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="CEP" error={errors.zip_code}>
          <input
            className="input"
            inputMode="numeric"
            value={form.zip_code}
            onChange={(e) => {
              const value = formatCEP(e.target.value);
              setForm((current) => ({ ...current, zip_code: value }));
            }}
            placeholder="00000-000"
          />
        </Field>
        <Field label="Rua" error={errors.adress_street} className="span-2">
          <input className="input" value={form.adress_street} onChange={set('adress_street')} />
        </Field>
        <Field label="Número" error={errors.adress_number}>
          <input className="input" value={form.adress_number} onChange={set('adress_number')} />
        </Field>
        <Field label="Complemento" optional error={errors.adress_complement}>
          <input className="input" value={form.adress_complement} onChange={set('adress_complement')} />
        </Field>
        <Field label="Bairro" error={errors.adress_neighborhood}>
          <input className="input" value={form.adress_neighborhood} onChange={set('adress_neighborhood')} />
        </Field>
        <Field label="Cidade" error={errors.adress_city}>
          <input className="input" value={form.adress_city} onChange={set('adress_city')} />
        </Field>
        <Field label="Estado (UF)" error={errors.adress_state}>
          <select className="select" value={form.adress_state} onChange={set('adress_state')}>
            {STATES.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}
