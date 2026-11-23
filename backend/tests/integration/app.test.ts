import request from 'supertest';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { createSequelize } from '../../src/config/sequelize';
import { setupTestApp, TestContext } from '../helpers';

describe('Infraestrutura HTTP', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('GET /api/health responde ok com status do banco', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up', service: 'clinicalcare-api' });
    expect(typeof res.body.latencyMs).toBe('number');
  });

  it('GET /api/health responde 503 quando o banco está indisponível', async () => {
    const sequelize = createSequelize(loadConfig());
    await sequelize.close();
    const res = await request(createApp(sequelize)).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'down' });
  });

  it('responde 404 em JSON para rotas inexistentes', async () => {
    const res = await request(ctx.app).get('/api/rota-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('/api/rota-inexistente');
  });

  it('responde 400 para JSON malformado', async () => {
    const res = await request(ctx.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email_or_login":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido no corpo da requisição.');
  });

  it('aplica cabeçalhos de segurança do Helmet e oculta x-powered-by', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('exige token nas rotas protegidas', async () => {
    const res = await request(ctx.app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});
