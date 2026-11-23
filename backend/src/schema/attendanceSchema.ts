import * as yup from 'yup';

export const attendanceSchema = yup.object({
  user_id: yup.number().typeError('Profissional inválido').required('Profissional é obrigatório'),
  company_id: yup.number().typeError('Clínica inválida').required('Clínica é obrigatória'),
  start_date: yup
    .string()
    .test('date', 'Data de início inválida', (value) => !value || !Number.isNaN(new Date(value).getTime()))
    .required('Data de início é obrigatória'),
  patient_id: yup.number().typeError('Paciente inválido').required('Paciente é obrigatório'),
  place_id: yup.number().typeError('Local inválido').required('Local é obrigatório'),
});
