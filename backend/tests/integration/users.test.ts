import request from 'supertest';
import { auth, setupTestApp, TestContext } from '../helpers';

const newUser = {
  name: 'Profissional Teste',
  email: 'profissional@teste.example',
  login: 'prof.teste',
  password: 'segura123',
  cpf: '935.411.347-80',
  phone: '(81) 90000-9999',
  role: 'DOCTOR',
  company_id: 1,
};

describe('Usuários', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('equipe lista usuários da própria clínica sem senha', async () => {
    const res = await request(ctx.app).get('/api/users').set(auth(ctx.tokens.recepcao));
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(7);
    res.body.users.forEach((u: Record<string, unknown>) => {
      expect(u.password).toBeUndefined();
      expect(u.company_id).toBe(1);
    });
  });

  it('pagina e filtra por perfil', async () => {
    const res = await request(ctx.app).get('/api/users?role=DOCTOR&page=1&limit=2').set(auth(ctx.tokens.admin));
    expect(res.body.users).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ currentPage: 1, itemsPerPage: 2 });
    expect(res.body.users.every((u: { role: string }) => u.role === 'DOCTOR')).toBe(true);
  });

  it('visitante não acessa a lista de usuários', async () => {
    const res = await request(ctx.app).get('/api/users').set(auth(ctx.tokens.visitante));
    expect(res.status).toBe(403);
  });

  it('administrador cria usuário e a resposta não traz a senha', async () => {
    const res = await request(ctx.app).post('/api/users').set(auth(ctx.tokens.admin)).send(newUser);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ login: 'prof.teste', cpf: '93541134780', root: false });
    expect(res.body.password).toBeUndefined();

    const login = await request(ctx.app).post('/api/auth/login').send({ email_or_login: 'prof.teste', password: 'segura123' });
    expect(login.status).toBe(200);
  });

  it('retorna 409 para login duplicado', async () => {
    const res = await request(ctx.app)
      .post('/api/users')
      .set(auth(ctx.tokens.admin))
      .send({ ...newUser, email: 'outro@teste.example', cpf: '71428793860' });
    expect(res.status).toBe(409);
    expect(res.body.details[0].field).toBe('login');
  });

  it('valida CPF e senha mínima', async () => {
    const res = await request(ctx.app)
      .post('/api/users')
      .set(auth(ctx.tokens.admin))
      .send({ ...newUser, login: 'novo.login', email: 'novo@teste.example', cpf: '123', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(['cpf', 'password']));
  });

  it.each(['medico', 'recepcao'])('perfil %s não cria usuários', async (login) => {
    const res = await request(ctx.app).post('/api/users').set(auth(ctx.tokens[login])).send(newUser);
    expect(res.status).toBe(403);
  });

  it('atualiza sem trocar a senha quando o campo vem vazio', async () => {
    const list = await request(ctx.app).get('/api/users?name=Profissional').set(auth(ctx.tokens.admin));
    const user = list.body.users[0];
    const res = await request(ctx.app)
      .put(`/api/users/${user.id}`)
      .set(auth(ctx.tokens.admin))
      .send({ ...newUser, name: 'Profissional Renomeado', password: '' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Profissional Renomeado');

    const login = await request(ctx.app).post('/api/auth/login').send({ email_or_login: 'prof.teste', password: 'segura123' });
    expect(login.status).toBe(200);

    const found = await request(ctx.app).get(`/api/users/${user.id}`).set(auth(ctx.tokens.medico));
    expect(found.body).toMatchObject({ name: 'Profissional Renomeado', email: 'profissional@teste.example' });
  });

  it('impede que o administrador exclua a si mesmo e exclui outros usuários', async () => {
    const self = await request(ctx.app).delete('/api/users/1').set(auth(ctx.tokens.admin));
    expect(self.status).toBe(400);

    const list = await request(ctx.app).get('/api/users?name=Profissional').set(auth(ctx.tokens.admin));
    const removed = await request(ctx.app).delete(`/api/users/${list.body.users[0].id}`).set(auth(ctx.tokens.admin));
    expect(removed.status).toBe(200);
    expect((await request(ctx.app).get(`/api/users/${list.body.users[0].id}`).set(auth(ctx.tokens.admin))).status).toBe(404);
  });

  it('não expõe usuário de outra clínica para perfis restritos', async () => {
    const res = await request(ctx.app).get('/api/users/8').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(404);
  });
});
