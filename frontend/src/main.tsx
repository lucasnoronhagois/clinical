import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { API_BASE_URL } from './lib/api';
import { isMockApiUrl } from './mock/config';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado');

async function bootstrap() {
  // Sem API real configurada, sobe a API interna de demonstração antes da primeira requisição.
  if (isMockApiUrl(API_BASE_URL)) {
    const { startMockApi } = await import('./mock/browser');
    await startMockApi();
  }
  createRoot(rootElement!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
