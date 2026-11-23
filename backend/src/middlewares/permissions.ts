import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/HttpError';

/** Bloqueia operações de escrita para visitantes (somente leitura). */
export function requireWriteAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(HttpError.unauthorized('Token não fornecido.'));
  if (req.user.role === 'GUEST') {
    return next(HttpError.forbidden('Usuários visitantes podem apenas visualizar dados.'));
  }
  next();
}

/** Recursos internos da equipe (ex.: lista de profissionais). Visitantes não acessam. */
export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(HttpError.unauthorized('Token não fornecido.'));
  if (req.user.role === 'GUEST') {
    return next(HttpError.forbidden('Apenas membros da equipe podem acessar esta funcionalidade.'));
  }
  next();
}

/** Somente administradores (usuários root). */
export function requireRoot(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(HttpError.unauthorized('Token não fornecido.'));
  if (!req.user.root) return next(HttpError.forbidden('Acesso permitido apenas para administradores.'));
  next();
}
