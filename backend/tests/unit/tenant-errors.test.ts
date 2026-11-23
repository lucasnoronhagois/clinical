import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../src/errors/HttpError';
import { errorHandler, notFoundHandler } from '../../src/middlewares/errorHandler';
import { requireRoot, requireStaff, requireWriteAccess } from '../../src/middlewares/permissions';
import { AuthUser } from '../../src/types/auth';
import { assertCompanyAccess, canAccessAllCompanies, resolveCompanyId } from '../../src/utils/tenant';

const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 1,
  name: 'Teste',
  email: 't@t.example',
  role: 'DOCTOR',
  root: false,
  company_id: 7,
  ...overrides,
});

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('tenant utils', () => {
  it('identifica perfis com acesso a todas as clínicas', () => {
    expect(canAccessAllCompanies(user({ root: true }))).toBe(true);
    expect(canAccessAllCompanies(user({ role: 'GUEST' }))).toBe(true);
    expect(canAccessAllCompanies(user())).toBe(false);
  });

  it('resolve a clínica do token para perfis restritos', () => {
    expect(resolveCompanyId(user(), '99')).toBe(7);
  });

  it('valida company_id para administradores', () => {
    expect(resolveCompanyId(user({ root: true }), '3')).toBe(3);
    expect(resolveCompanyId(user({ root: true }), undefined, false)).toBeUndefined();
    expect(() => resolveCompanyId(user({ root: true }), undefined)).toThrow('company_id é obrigatório.');
    expect(() => resolveCompanyId(user({ root: true }), '-1')).toThrow('company_id inválido.');
  });

  it('bloqueia acesso a registros de outra clínica com 404', () => {
    expect(() => assertCompanyAccess(user(), 7, 'x')).not.toThrow();
    expect(() => assertCompanyAccess(user({ root: true }), 1, 'x')).not.toThrow();
    try {
      assertCompanyAccess(user(), 1, 'Não encontrado');
      throw new Error('deveria lançar');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(404);
    }
  });
});

describe('middlewares de permissão', () => {
  const run = (mw: (req: Request, res: Response, next: NextFunction) => void, u?: AuthUser) => {
    const next = jest.fn();
    mw({ user: u } as Request, mockRes(), next);
    const arg = next.mock.calls[0][0];
    return arg instanceof HttpError ? arg.status : 'next';
  };

  it.each([
    [requireWriteAccess, undefined, 401],
    [requireWriteAccess, user({ role: 'GUEST' }), 403],
    [requireWriteAccess, user(), 'next'],
    [requireStaff, undefined, 401],
    [requireStaff, user({ role: 'GUEST' }), 403],
    [requireStaff, user({ role: 'RECEPTIONIST' }), 'next'],
    [requireRoot, undefined, 401],
    [requireRoot, user(), 403],
    [requireRoot, user({ root: true }), 'next'],
  ])('%p com usuário %p resulta em %p', (mw, u, expected) => {
    expect(run(mw, u)).toBe(expected);
  });
});

describe('errorHandler', () => {
  const handle = (err: unknown) => {
    const res = mockRes();
    errorHandler(err, {} as Request, res, jest.fn());
    return { status: (res.status as jest.Mock).mock.calls[0][0], body: (res.json as jest.Mock).mock.calls[0][0] };
  };

  it('converte HttpError com detalhes', () => {
    expect(handle(HttpError.badRequest('Dados inválidos', [{ field: 'name', message: 'obrigatório' }]))).toEqual({
      status: 400,
      body: { error: 'Dados inválidos', details: [{ field: 'name', message: 'obrigatório' }] },
    });
  });

  it.each([
    ['SequelizeUniqueConstraintError', 409],
    ['SequelizeValidationError', 400],
    ['SequelizeForeignKeyConstraintError', 409],
  ])('mapeia %s para %i', (name, status) => {
    const err = Object.assign(new Error('db'), { name, errors: [{ path: 'cpf', message: 'erro' }] });
    expect(handle(err).status).toBe(status);
  });

  it('oculta detalhes de erros inesperados', () => {
    expect(handle(new Error('segredo interno'))).toEqual({ status: 500, body: { error: 'Erro interno do servidor.' } });
  });

  it('notFoundHandler encaminha HttpError 404', () => {
    const next = jest.fn();
    notFoundHandler({ method: 'GET', originalUrl: '/x' } as Request, mockRes(), next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 404 });
  });

  it('fábricas de HttpError usam os status corretos', () => {
    expect(HttpError.unauthorized().status).toBe(401);
    expect(HttpError.forbidden().status).toBe(403);
    expect(HttpError.notFound().status).toBe(404);
    expect(HttpError.conflict('x').status).toBe(409);
  });
});
