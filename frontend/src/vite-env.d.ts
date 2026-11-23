/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API (sem /api). Padrão: /mock-api, a API interna de demonstração. */
  readonly VITE_API_URL?: string;
  /** Latência simulada da API interna, em milissegundos. */
  readonly VITE_MOCK_LATENCY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
