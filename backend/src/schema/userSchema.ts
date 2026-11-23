import * as yup from 'yup';
import { validateCPF } from '../utils';

const base = {
  name: yup.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres').required('Nome é obrigatório'),
  email: yup.string().trim().lowercase().max(100, 'Email deve ter no máximo 100 caracteres').email('Email inválido').required('Email é obrigatório'),
  login: yup.string().trim().min(3, 'Login deve ter no mínimo 3 caracteres').max(20, 'Login deve ter no máximo 20 caracteres').required('Login é obrigatório'),
  cpf: yup
    .string()
    .trim()
    .required('CPF é obrigatório')
    .test('cpf', 'CPF inválido', (value) => !value || validateCPF(value))
    .transform((value: string) => value?.replace(/\D/g, '')),
  phone: yup.string().trim().max(20, 'Telefone deve ter no máximo 20 caracteres').optional(),
  role: yup.string().oneOf(['DOCTOR', 'RECEPTIONIST', 'GUEST'], 'Perfil inválido').required('Perfil é obrigatório'),
  root: yup.boolean().optional(),
  company_id: yup.number().typeError('Clínica inválida').required('Clínica é obrigatória'),
};

export const userSchema = yup.object({
  ...base,
  password: yup.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha deve ter no máximo 100 caracteres').required('Senha é obrigatória'),
});

export const userUpdateSchema = yup.object({
  ...base,
  password: yup
    .string()
    .transform((value: string) => (value === '' ? undefined : value))
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres')
    .optional(),
});
