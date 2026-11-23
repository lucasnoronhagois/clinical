import * as yup from 'yup';

export const loginSchema = yup.object({
  email_or_login: yup.string().trim().min(3, 'Email ou login deve ter no mínimo 3 caracteres').max(100).required('Email ou login é obrigatório'),
  password: yup.string().min(3, 'Senha deve ter no mínimo 3 caracteres').max(100).required('Senha é obrigatória'),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Senha atual é obrigatória'),
  newPassword: yup.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres').max(100).required('Nova senha é obrigatória'),
});
