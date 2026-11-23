import { Request, Response } from 'express';
import { asyncHandler } from './asyncHandler';

/** Liga um método de controller ao Express, preservando `this` e encaminhando erros assíncronos. */
export const action = <T extends object>(controller: T, method: keyof T) => {
  const fn = controller[method] as unknown as (req: Request, res: Response) => Promise<unknown>;
  return asyncHandler((req, res) => fn.call(controller, req, res));
};
