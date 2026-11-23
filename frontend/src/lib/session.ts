import { SessionUser } from '../types';

interface TokenPayload extends SessionUser {
  exp?: number;
}

/** Decodifica o payload do JWT (sem validar assinatura; a API valida a cada requisição). */
export function decodeToken(token: string | null): TokenPayload | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(json, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: TokenPayload | null, now = Date.now()): boolean {
  if (!payload) return true;
  return typeof payload.exp === 'number' && payload.exp * 1000 <= now;
}

export function sessionFromToken(token: string | null): SessionUser | null {
  const payload = decodeToken(token);
  if (!payload || isTokenExpired(payload)) return null;
  const { id, name, email, role, root, company_id } = payload;
  return { id, name, email, role, root: Boolean(root), company_id };
}
