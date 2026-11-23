import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, Providers } from '../App';
import { COMPANY_KEY } from '../context/AuthContext';
import { TOKEN_KEY } from '../lib/api';
import { Company, SessionUser } from '../types';

// Como em um JWT real: JSON em UTF-8 codificado em base64url.
const encode = (value: object) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

/** Gera um JWT sem assinatura válida; o front só lê o payload. */
export function makeToken(user: Partial<SessionUser> = {}, expiresInSeconds = 3600): string {
  const payload = { ...buildUser(user), exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

export function buildUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: 2, name: 'Dra. Marina Albuquerque', email: 'medico@vidaplena.example', role: 'DOCTOR', root: false, company_id: 1, ...overrides };
}

export const demoCompany: Company = {
  id: 1,
  name: 'Clínica Vida Plena',
  email: 'contato@vidaplena.example',
  zip_code: '50000000',
  adress_street: 'Rua das Acácias',
  adress_number: '120',
  adress_complement: null,
  adress_neighborhood: 'Jardim Demonstração',
  adress_city: 'Recife',
  adress_state: 'PE',
};

export function signIn(user: Partial<SessionUser> = {}, companyId?: number) {
  localStorage.setItem(TOKEN_KEY, makeToken(user));
  if (companyId) localStorage.setItem(COMPANY_KEY, String(companyId));
}

export function renderApp(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Providers>
        <AppRoutes />
      </Providers>
    </MemoryRouter>,
  );
}

export function renderWithProviders(ui: ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Providers>{ui}</Providers>
    </MemoryRouter>,
  );
}
