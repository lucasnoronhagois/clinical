import * as yup from 'yup';
import { validateCPF } from '../utils';

export const patientSchema = yup.object({
  name: yup.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres').required('Nome é obrigatório'),
  cpf: yup
    .string()
    .transform((value: string) => (value ? value.replace(/\D/g, '') : null))
    .test('cpf', 'CPF inválido', (value) => !value || validateCPF(value))
    .optional()
    .nullable(),
  birth_date: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}/, 'Data de nascimento inválida')
    .test('past', 'Data de nascimento não pode ser futura', (value) => !value || new Date(value) <= new Date())
    .required('Data de nascimento é obrigatória'),
  company_id: yup.number().typeError('Clínica inválida').required('Clínica é obrigatória'),
});
