import { buildMockData, MOCK_DATA_VERSION, MockData } from './fixtures';

export const MOCK_STORAGE_KEY = 'clinicalcare.mock-db';
/** Após esse período os dados são regenerados para a agenda continuar atual. */
const MAX_AGE_MS = 7 * 86400000;

export interface MockStore {
  data: MockData;
  save: () => void;
  reset: (now?: Date) => void;
}

/** Banco em memória; quando `persist` é verdadeiro, sobrevive a recarregamentos via localStorage. */
export function createMockStore({ persist = false, now = () => new Date() }: { persist?: boolean; now?: () => Date } = {}): MockStore {
  const load = (): MockData => {
    if (persist) {
      try {
        const raw = localStorage.getItem(MOCK_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MockData;
          const fresh = now().getTime() - new Date(parsed.generatedAt).getTime() < MAX_AGE_MS;
          if (parsed.version === MOCK_DATA_VERSION && fresh) return parsed;
        }
      } catch {
        // Dados corrompidos: gera novamente.
      }
    }
    return buildMockData(now());
  };

  const store: MockStore = {
    data: load(),
    save: () => {
      if (persist) localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(store.data));
    },
    reset: (at = now()) => {
      store.data = buildMockData(at);
      store.save();
    },
  };
  store.save();
  return store;
}
