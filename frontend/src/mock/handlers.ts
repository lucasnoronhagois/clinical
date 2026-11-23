import { delay, http, HttpResponse } from 'msw';
import { MOCK_API_BASE } from './config';
import { createMockApi } from './mockApi';
import { createMockStore, MockStore } from './store';

interface HandlerOptions {
  store?: MockStore;
  /** Latência simulada em milissegundos (padrão 0). */
  latency?: number;
  now?: () => Date;
}

/** Handlers do Mock Service Worker: interceptam `${MOCK_API_BASE}/api/*` e delegam para a API simulada. */
export function createHandlers({ store = createMockStore(), latency = 0, now }: HandlerOptions = {}) {
  const api = createMockApi(store, now);
  return [
    http.all(`*${MOCK_API_BASE}/api/*`, async ({ request }) => {
      if (latency > 0) await delay(latency);
      const url = new URL(request.url);
      const path = url.pathname.slice(url.pathname.indexOf(`${MOCK_API_BASE}/api`) + `${MOCK_API_BASE}/api`.length) || '/';
      let body: unknown;
      if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) {
        const text = await request.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            return HttpResponse.json({ error: 'JSON inválido no corpo da requisição.' }, { status: 400 });
          }
        }
      }
      const result = api.handle({
        method: request.method,
        path,
        query: url.searchParams,
        body,
        headers: { authorization: request.headers.get('authorization') },
      });
      return HttpResponse.json(result.body as Record<string, unknown>, { status: result.status });
    }),
  ];
}
