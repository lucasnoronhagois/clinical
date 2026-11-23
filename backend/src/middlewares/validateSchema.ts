import { NextFunction, Request, Response } from 'express';
import { AnySchema, ValidationError } from 'yup';
import { HttpError } from '../errors/HttpError';

type Source = 'body' | 'query' | 'params';

export const validateSchema =
  (schema: AnySchema, source: Source = 'body') =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.validate(req[source], { abortEarly: false, stripUnknown: true });
      if (source === 'body') {
        req.body = validated;
      } else {
        Object.assign(req[source], validated);
      }
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        const details = error.inner.length
          ? error.inner.map((item) => ({ field: item.path, message: item.message }))
          : [{ field: error.path, message: error.message }];
        next(HttpError.badRequest('Dados inválidos', details));
        return;
      }
      next(error);
    }
  };
