/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API (sem /api). Padrão: /mock-api, a API interna de demonstração. */
  readonly VITE_API_URL?: string;
  /** Latência simulada da API interna, em milissegundos. */
  readonly VITE_MOCK_LATENCY_MS?: string;
  /** Tempo, em milissegundos, em que o cache é considerado atualizado. Padrão: 60000. */
  readonly VITE_CACHE_STALE_TIME_MS?: string;
  /** Tempo, em milissegundos, de retenção do cache após sair da tela (gcTime). Padrão: 300000. */
  readonly VITE_CACHE_GC_TIME_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
