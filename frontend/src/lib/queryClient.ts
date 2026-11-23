import { QueryClient } from '@tanstack/react-query';
import { readCacheTimes } from './cacheConfig';

export function createQueryClient() {
  const { staleTime, gcTime } = readCacheTimes();
  const isTest = import.meta.env.MODE === 'test';
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime,
        gcTime,
        retry: isTest ? false : 1,
        // refetchOnWindowFocus no padrão do React Query: só revalida quando os dados estão stale.
      },
      mutations: { retry: false },
    },
  });
}
