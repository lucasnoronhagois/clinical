import * as yup from 'yup';

const text = (label: string, min = 2, max = 100) =>
  yup.string().trim().min(min, `${label} deve ter no mínimo ${min} caracteres`).max(max, `${label} deve ter no máximo ${max} caracteres`);

export const companySchema = yup.object({
  name: text('Nome', 3).required('Nome é obrigatório'),
  email: yup.string().trim().lowercase().email('Email inválido').max(100).required('Email é obrigatório'),
  zip_code: yup
    .string()
    .transform((value: string) => value?.replace(/\D/g, ''))
    .length(8, 'CEP deve ter 8 dígitos')
    .required('CEP é obrigatório'),
  adress_street: text('Rua', 3).required('Rua é obrigatória'),
  adress_number: text('Número', 1, 20).required('Número é obrigatório'),
  adress_complement: yup.string().trim().max(100).optional().nullable(),
  adress_neighborhood: text('Bairro').required('Bairro é obrigatório'),
  adress_city: text('Cidade').required('Cidade é obrigatória'),
  adress_state: yup.string().trim().uppercase().length(2, 'Use a sigla do estado (UF)').required('Estado é obrigatório'),
});
