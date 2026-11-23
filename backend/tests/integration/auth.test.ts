import request from 'supertest';
import { User } from '../../src/models';
import { auth, setupTestApp, TestContext } from '../helpers';

describe('Autenticação', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('faz login pelo login e retorna token sem expor a senha', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email_or_login: 'admin', password: 'demo123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ login: 'admin', root: true });
    expect(res.body.user.password).toBeUndefined();
  });

  it('faz login pelo email sem diferenciar maiúsculas', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email_or_login: 'MEDICO@clinicalcare.example', password: 'demo123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('DOCTOR');
  });

  it.each([
    ['senha incorreta', { email_or_login: 'admin', password: 'errada' }],
    ['usuário inexistente', { email_or_login: 'ninguem', password: 'demo123' }],
  ])('rejeita %s com 401 e mensagem genérica', async (_label, body) => {
    const res = await request(ctx.app).post('/api/auth/login').send(body);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Usuário ou senha inválidos.');
  });

  it('valida o corpo do login', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email_or_login: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual(['email_or_login', 'password']);
  });

  it('não permite login de usuário excluído', async () => {
    await User.update({ is_deleted: true }, { where: { login: 'diego.farias' } });
    const res = await request(ctx.app).post('/api/auth/login').send({ email_or_login: 'diego.farias', password: 'demo123' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me retorna o usuário autenticado', async () => {
    const res = await request(ctx.app).get('/api/auth/me').set(auth(ctx.tokens.recepcao));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ login: 'recepcao', role: 'RECEPTIONIST' });
    expect(res.body.password).toBeUndefined();
  });

  it('rejeita token inválido', async () => {
    const res = await request(ctx.app).get('/api/auth/me').set(auth('token.invalido.aqui'));
    expect(res.status).toBe(401);
  });

  it('rejeita cabeçalho sem o esquema Bearer', async () => {
    const res = await request(ctx.app).get('/api/auth/me').set('Authorization', ctx.tokens.admin);
    expect(res.status).toBe(401);
  });

  it('altera a senha quando a senha atual confere', async () => {
    const wrong = await request(ctx.app)
      .post('/api/auth/change-password')
      .set(auth(ctx.tokens['tiago.moreira']))
      .send({ currentPassword: 'outra', newPassword: 'novaSenha1' });
    expect(wrong.status).toBe(400);

    const ok = await request(ctx.app)
      .post('/api/auth/change-password')
      .set(auth(ctx.tokens['tiago.moreira']))
      .send({ currentPassword: 'demo123', newPassword: 'novaSenha1' });
    expect(ok.status).toBe(200);

    const login = await request(ctx.app).post('/api/auth/login').send({ email_or_login: 'tiago.moreira', password: 'novaSenha1' });
    expect(login.status).toBe(200);
  });

  it('exige autenticação para alterar senha', async () => {
    const res = await request(ctx.app).post('/api/auth/change-password').send({ currentPassword: 'demo123', newPassword: 'abcdef' });
    expect(res.status).toBe(401);
  });
});
