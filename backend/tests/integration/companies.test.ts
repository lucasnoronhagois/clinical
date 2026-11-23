import request from 'supertest';
import { auth, setupTestApp, TestContext } from '../helpers';

const validCompany = {
  name: 'Clínica Teste Integração',
  email: 'CONTATO@teste.example',
  zip_code: '50.100-000',
  adress_street: 'Rua Exemplo',
  adress_number: '10',
  adress_neighborhood: 'Centro',
  adress_city: 'Recife',
  adress_state: 'pe',
};

describe('Clínicas (companies)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('administrador e visitante enxergam todas as clínicas', async () => {
    for (const login of ['admin', 'visitante']) {
      const res = await request(ctx.app).get('/api/companies').set(auth(ctx.tokens[login]));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    }
  });

  it('demais perfis enxergam apenas a própria clínica', async () => {
    const res = await request(ctx.app).get('/api/companies').set(auth(ctx.tokens.medico));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Clínica Vida Plena');
  });

  it('retorna 404 ao acessar clínica de outro tenant', async () => {
    const res = await request(ctx.app).get('/api/companies/2').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(404);
  });

  it('administrador cria clínica com dados normalizados', async () => {
    const res = await request(ctx.app).post('/api/companies').set(auth(ctx.tokens.admin)).send(validCompany);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'contato@teste.example', zip_code: '50100000', adress_state: 'PE' });
  });

  it('valida campos obrigatórios e formato', async () => {
    const res = await request(ctx.app)
      .post('/api/companies')
      .set(auth(ctx.tokens.admin))
      .send({ ...validCompany, email: 'invalido', zip_code: '123', adress_state: 'Pernambuco' });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'zip_code', 'adress_state']));
  });

  it.each(['medico', 'recepcao', 'visitante'])('perfil %s não pode criar clínicas', async (login) => {
    const res = await request(ctx.app).post('/api/companies').set(auth(ctx.tokens[login])).send(validCompany);
    expect(res.status).toBe(403);
  });

  it('administrador atualiza e exclui (soft delete) uma clínica', async () => {
    const created = await request(ctx.app)
      .post('/api/companies')
      .set(auth(ctx.tokens.admin))
      .send({ ...validCompany, email: 'outra@teste.example' });
    const id = created.body.id;

    const updated = await request(ctx.app)
      .put(`/api/companies/${id}`)
      .set(auth(ctx.tokens.admin))
      .send({ ...validCompany, email: 'outra@teste.example', name: 'Clínica Renomeada' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Clínica Renomeada');

    const removed = await request(ctx.app).delete(`/api/companies/${id}`).set(auth(ctx.tokens.admin));
    expect(removed.status).toBe(200);

    const after = await request(ctx.app).get(`/api/companies/${id}`).set(auth(ctx.tokens.admin));
    expect(after.status).toBe(404);
  });
});
