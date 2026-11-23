import { describe, expect, it } from 'vitest';
import { DEFAULT_CACHE_GC_TIME_MS, DEFAULT_CACHE_STALE_TIME_MS, readCacheTimes } from '../../lib/cacheConfig';
import { createQueryClient } from '../../lib/queryClient';

describe('tempos de cache', () => {
  it('usa 60000 e 300000 quando as variáveis estão ausentes ou inválidas', () => {
    expect(DEFAULT_CACHE_STALE_TIME_MS).toBe(60_000);
    expect(DEFAULT_CACHE_GC_TIME_MS).toBe(300_000);
    expect(readCacheTimes({})).toEqual({ staleTime: 60_000, gcTime: 300_000 });
    expect(readCacheTimes({ VITE_CACHE_STALE_TIME_MS: '', VITE_CACHE_GC_TIME_MS: 'abc' })).toEqual({ staleTime: 60_000, gcTime: 300_000 });
    expect(readCacheTimes({ VITE_CACHE_STALE_TIME_MS: '-10', VITE_CACHE_GC_TIME_MS: '1.5' })).toEqual({ staleTime: 60_000, gcTime: 300_000 });
    expect(readCacheTimes({ VITE_CACHE_STALE_TIME_MS: '  ', VITE_CACHE_GC_TIME_MS: 'NaN' })).toEqual({ staleTime: 60_000, gcTime: 300_000 });
  });

  it('aceita inteiros não negativos informados no ambiente', () => {
    expect(readCacheTimes({ VITE_CACHE_STALE_TIME_MS: '120000', VITE_CACHE_GC_TIME_MS: '600000' })).toEqual({ staleTime: 120_000, gcTime: 600_000 });
    expect(readCacheTimes({ VITE_CACHE_STALE_TIME_MS: '0', VITE_CACHE_GC_TIME_MS: ' 0 ' })).toEqual({ staleTime: 0, gcTime: 0 });
  });

  it('aplica os padrões ao criar o cliente de consultas neste ambiente de teste', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(60_000);
    expect(client.getDefaultOptions().queries?.gcTime).toBe(300_000);
  });
});
