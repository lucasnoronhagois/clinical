import { setupServer } from 'msw/node';
import { createHandlers } from '../mock/handlers';
import { createMockStore } from '../mock/store';

/** Servidor MSW dos testes: a API interna responde via HTTP, como no navegador. */
export const server = setupServer();

/** Recria a API com um banco limpo; retorna o store para inspeção nos testes. */
export function resetMockApi() {
  const store = createMockStore();
  server.resetHandlers(...createHandlers({ store }));
  return store;
}
