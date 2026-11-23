/** Rota interna que responde no lugar da API real. Use em VITE_API_URL para ativar o mock. */
export const MOCK_API_BASE = '/mock-api';

export const isMockApiUrl = (url: string | undefined) => (url ?? '').replace(/\/$/, '').endsWith(MOCK_API_BASE);
