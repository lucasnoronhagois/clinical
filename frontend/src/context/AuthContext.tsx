import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, TOKEN_KEY } from '../lib/api';
import { canSwitchCompany } from '../lib/permissions';
import { sessionFromToken } from '../lib/session';
import { Company, SessionUser } from '../types';

export const COMPANY_KEY = 'clinicalcare.companyId';

interface AuthContextValue {
  user: SessionUser | null;
  companyId: number | null;
  company: Company | null;
  login: (identifier: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  selectCompany: (company: Company) => void;
  clearCompany: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionState {
  user: SessionUser | null;
  companyId: number | null;
}

function readInitialState(): SessionState {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = sessionFromToken(token);
  if (!user) {
    localStorage.removeItem(TOKEN_KEY);
    return { user: null, companyId: null };
  }
  const stored = Number(localStorage.getItem(COMPANY_KEY));
  const companyId = canSwitchCompany(user) ? (stored > 0 ? stored : null) : user.company_id;
  return { user, companyId };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(readInitialState);
  const [company, setCompany] = useState<Company | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(COMPANY_KEY);
    setCompany(null);
    setState({ user: null, companyId: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Carrega os dados da clínica ativa para exibir nome e endereço na interface.
  useEffect(() => {
    if (!state.user || !state.companyId) {
      setCompany(null);
      return;
    }
    if (company?.id === state.companyId) return;
    let active = true;
    api
      .get<Company>(`/companies/${state.companyId}`)
      .then(({ data }) => active && setCompany(data))
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(COMPANY_KEY);
        setState((current) => ({ ...current, companyId: canSwitchCompany(current.user) ? null : current.companyId }));
      });
    return () => {
      active = false;
    };
  }, [state.user, state.companyId, company?.id]);

  const login = useCallback(async (identifier: string, password: string) => {
    const { data } = await api.post<{ token: string }>('/auth/login', { email_or_login: identifier, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    const user = sessionFromToken(data.token);
    if (!user) throw new Error('Token inválido recebido da API.');
    const companyId = canSwitchCompany(user) ? null : user.company_id;
    localStorage.removeItem(COMPANY_KEY);
    setCompany(null);
    setState({ user, companyId });
    return user;
  }, []);

  const selectCompany = useCallback((selected: Company) => {
    localStorage.setItem(COMPANY_KEY, String(selected.id));
    setCompany(selected);
    setState((current) => ({ ...current, companyId: selected.id }));
  }, []);

  const clearCompany = useCallback(() => {
    localStorage.removeItem(COMPANY_KEY);
    setCompany(null);
    setState((current) => ({ ...current, companyId: null }));
  }, []);

  const value = useMemo(
    () => ({ user: state.user, companyId: state.companyId, company, login, logout, selectCompany, clearCompany }),
    [state, company, login, logout, selectCompany, clearCompany],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

/** Atalho para páginas que só existem com uma clínica selecionada. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const auth = useAuth();
  if (!auth.user || !auth.companyId) throw new Error('Sessão sem clínica selecionada');
  return { ...auth, user: auth.user, companyId: auth.companyId };
}
