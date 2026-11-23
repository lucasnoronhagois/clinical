import request from 'supertest';
import { auth, setupTestApp, TestContext } from '../helpers';

describe('Locais de atendimento', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('lista os locais da clínica', async () => {
    const res = await request(ctx.app).get('/api/places').set(auth(ctx.tokens.recepcao));
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Consultório 1', 'Consultório 2', 'Sala de Exames', 'Sala de Procedimentos']);
  });

  it('cria, renomeia e exclui um local', async () => {
    const created = await request(ctx.app).post('/api/places').set(auth(ctx.tokens.recepcao)).send({ name: 'Sala de Vacinação', company_id: 1 });
    expect(created.status).toBe(201);

    const updated = await request(ctx.app)
      .put(`/api/places/${created.body.id}`)
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Sala de Imunização', company_id: 1 });
    expect(updated.body.name).toBe('Sala de Imunização');

    const removed = await request(ctx.app).delete(`/api/places/${created.body.id}`).set(auth(ctx.tokens.recepcao));
    expect(removed.status).toBe(200);
    expect((await request(ctx.app).get(`/api/places/${created.body.id}`).set(auth(ctx.tokens.recepcao))).status).toBe(404);
  });

  it('valida o nome do local', async () => {
    const res = await request(ctx.app).post('/api/places').set(auth(ctx.tokens.recepcao)).send({ name: 'ab', company_id: 1 });
    expect(res.status).toBe(400);
  });

  it('visitante não altera locais', async () => {
    const res = await request(ctx.app).post('/api/places').set(auth(ctx.tokens.visitante)).send({ name: 'Sala Visitante', company_id: 1 });
    expect(res.status).toBe(403);
  });

  it('não permite editar local de outra clínica', async () => {
    const res = await request(ctx.app).put('/api/places/5').set(auth(ctx.tokens.recepcao)).send({ name: 'Invasão', company_id: 1 });
    expect(res.status).toBe(404);
  });
});
