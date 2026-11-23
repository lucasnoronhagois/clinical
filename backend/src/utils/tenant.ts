import { HttpError } from '../errors/HttpError';
import { AuthUser } from '../types/auth';

/** Administradores e visitantes podem navegar entre clínicas; demais perfis ficam restritos à própria. */
export const canAccessAllCompanies = (user: AuthUser): boolean => user.root || user.role === 'GUEST';

/**
 * Resolve qual clínica deve ser usada no filtro da requisição.
 * Para perfis restritos, a clínica do token sempre prevalece.
 */
export function resolveCompanyId(user: AuthUser, requested?: unknown, required = true): number | undefined {
  if (!canAccessAllCompanies(user)) return user.company_id;

  const parsed = requested === undefined || requested === '' ? undefined : Number(requested);
  if (parsed !== undefined && (!Number.isInteger(parsed) || parsed <= 0)) {
    throw HttpError.badRequest('company_id inválido.');
  }
  if (required && parsed === undefined) {
    throw HttpError.badRequest('company_id é obrigatório.');
  }
  return parsed;
}

/** Garante que um registro pertence a uma clínica acessível pelo usuário. Responde 404 para não vazar existência. */
export function assertCompanyAccess(user: AuthUser, companyId: number, notFoundMessage: string): void {
  if (!canAccessAllCompanies(user) && Number(companyId) !== Number(user.company_id)) {
    throw HttpError.notFound(notFoundMessage);
  }
}
