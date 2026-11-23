import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { HttpError } from '../errors/HttpError';
import { AuthUser } from '../types/auth';

export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const [scheme, token] = header?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    next(HttpError.unauthorized('Token não fornecido.'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser & jwt.JwtPayload;
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      root: Boolean(payload.root),
      company_id: payload.company_id,
    };
    next();
  } catch {
    next(HttpError.unauthorized('Sessão expirada ou token inválido.'));
  }
}
