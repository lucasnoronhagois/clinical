import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/HttpError';

interface SequelizeLikeError extends Error {
  errors?: Array<{ path?: string; message: string }>;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`Rota ${req.method} ${req.originalUrl} não encontrada.`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }

  const error = err as SequelizeLikeError;

  if (error?.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({
      error: 'Registro duplicado.',
      details: error.errors?.map((item) => ({ field: item.path, message: `${item.path} já cadastrado.` })),
    });
    return;
  }

  if (error?.name === 'SequelizeValidationError') {
    res.status(400).json({
      error: 'Dados inválidos',
      details: error.errors?.map((item) => ({ field: item.path, message: item.message })),
    });
    return;
  }

  if (error?.name === 'SequelizeForeignKeyConstraintError') {
    res.status(409).json({ error: 'Operação viola um relacionamento existente.' });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
    return;
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[unhandled]', err);
  }
  res.status(500).json({ error: 'Erro interno do servidor.' });
}
