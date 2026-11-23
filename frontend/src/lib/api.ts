import axios, { AxiosError } from 'axios';

export const TOKEN_KEY = 'clinicalcare.token';

/**
 * URL base da API, sem o sufixo /api. O padrão é a API interna de demonstração (`/mock-api`),
 * atendida pelo Mock Service Worker com o mesmo contrato da API Node. Para usar a API real,
 * basta definir VITE_API_URL (ex.: http://localhost:3000).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/mock-api').replace(/\/$/, '');
const baseURL = API_BASE_URL;

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener | null = null;

/** Permite que o AuthProvider encerre a sessão quando a API responder 401. */
export const setUnauthorizedHandler = (listener: UnauthorizedListener | null) => {
  onUnauthorized = listener;
};

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) onUnauthorized?.();
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  error?: string;
  details?: Array<{ field?: string; message: string }>;
}

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Não foi possível conectar à API. Verifique se o servidor está em execução.';
    const { error: message, details } = error.response.data ?? {};
    if (details?.length) return details.map((d) => d.message).join(' ');
    if (message) return message;
  }
  return fallback;
}

/** Converte os detalhes de validação da API em um mapa campo/mensagem para os formulários. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return {};
  return (error.response?.data?.details ?? []).reduce<Record<string, string>>((acc, detail) => {
    if (detail.field && !acc[detail.field]) acc[detail.field] = detail.message;
    return acc;
  }, {});
}
