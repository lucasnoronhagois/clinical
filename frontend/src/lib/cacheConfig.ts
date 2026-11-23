/** Padrão: 60 segundos de dados considerados atualizados. */
export const DEFAULT_CACHE_STALE_TIME_MS = 60_000;
/** Padrão: 5 minutos até o lixo coletor liberar o cache (gcTime). */
export const DEFAULT_CACHE_GC_TIME_MS = 300_000;

type EnvMap = Record<string, string | undefined>;

/** Aceita só inteiros maiores ou iguais a zero; qualquer outro valor cai no padrão. */
export function parseCacheTimeMs(value: string | undefined, fallback: number): number {
  if (value == null) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function readCacheTimes(env: EnvMap = import.meta.env): { staleTime: number; gcTime: number } {
  return {
    staleTime: parseCacheTimeMs(env.VITE_CACHE_STALE_TIME_MS, DEFAULT_CACHE_STALE_TIME_MS),
    gcTime: parseCacheTimeMs(env.VITE_CACHE_GC_TIME_MS, DEFAULT_CACHE_GC_TIME_MS),
  };
}
