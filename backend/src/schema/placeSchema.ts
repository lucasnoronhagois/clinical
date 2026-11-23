import * as yup from 'yup';

export const placeSchema = yup.object({
  name: yup.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres').required('Nome é obrigatório'),
  company_id: yup.number().typeError('Clínica inválida').required('Clínica é obrigatória'),
});
