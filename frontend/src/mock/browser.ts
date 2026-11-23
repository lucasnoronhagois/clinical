import { setupWorker } from 'msw/browser';
import { createHandlers } from './handlers';
import { createMockStore } from './store';

export const mockStore = createMockStore({ persist: true });

/** Inicia o Service Worker que atende a API interna de demonstração no navegador. */
export async function startMockApi() {
  const latency = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 350);
  const worker = setupWorker(...createHandlers({ store: mockStore, latency: Number.isFinite(latency) ? latency : 0 }));
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true, serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` } });
}
