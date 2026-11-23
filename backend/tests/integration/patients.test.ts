import request from 'supertest';
import { auth, setupTestApp, TestContext } from '../helpers';

describe('Pacientes', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('lista pacientes da clínica do usuário em ordem alfabética', async () => {
    const res = await request(ctx.app).get('/api/patients').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(42);
    const names = res.body.map((p: { name: string }) => p.name);
    // SQLite ordena por bytes; no MySQL a collation unicode ordena sem diferenciar acentos.
    expect(names).toEqual([...names].sort());
  });

  it('ignora company_id de outra clínica para perfis restritos', async () => {
    const res = await request(ctx.app).get('/api/patients?company_id=2').set(auth(ctx.tokens.medico));
    expect(res.body.every((p: { company_id: number }) => p.company_id === 1)).toBe(true);
  });

  it('administrador filtra por clínica', async () => {
    const res = await request(ctx.app).get('/api/patients?company_id=2').set(auth(ctx.tokens.admin));
    expect(res.body).toHaveLength(16);
  });

  it('rejeita company_id inválido', async () => {
    const res = await request(ctx.app).get('/api/patients?company_id=abc').set(auth(ctx.tokens.admin));
    expect(res.status).toBe(400);
  });

  it('busca por nome', async () => {
    const all = await request(ctx.app).get('/api/patients').set(auth(ctx.tokens.medico));
    const target = all.body[0].name.split(' ')[0];
    const res = await request(ctx.app).get(`/api/patients?search=${encodeURIComponent(target)}`).set(auth(ctx.tokens.medico));
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((p: { name: string }) => p.name.includes(target))).toBe(true);
  });

  it('cria paciente normalizando o CPF', async () => {
    const res = await request(ctx.app)
      .post('/api/patients')
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Paciente Teste', cpf: '529.982.247-25', birth_date: '1990-05-10', company_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body.cpf).toBe('52998224725');
  });

  it('cria paciente sem CPF', async () => {
    const res = await request(ctx.app)
      .post('/api/patients')
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Paciente Sem CPF', cpf: '', birth_date: '2010-01-01', company_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body.cpf).toBeNull();
  });

  it('força a clínica do token ao criar com perfil restrito', async () => {
    const res = await request(ctx.app)
      .post('/api/patients')
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Paciente Outra Clínica', birth_date: '2000-02-02', company_id: 2 });
    expect(res.status).toBe(201);
    expect(res.body.company_id).toBe(1);
  });

  it('rejeita CPF inválido e data de nascimento futura', async () => {
    const res = await request(ctx.app)
      .post('/api/patients')
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Paciente Inválido', cpf: '111.111.111-11', birth_date: '2999-01-01', company_id: 1 });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['cpf', 'birth_date']));
  });

  it('retorna 409 para CPF duplicado', async () => {
    const res = await request(ctx.app)
      .post('/api/patients')
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Paciente Duplicado', cpf: '52998224725', birth_date: '1990-05-10', company_id: 1 });
    expect(res.status).toBe(409);
  });

  it('visitante não pode criar pacientes', async () => {
    const res = await request(ctx.app)
      .post('/api/patients')
      .set(auth(ctx.tokens.visitante))
      .send({ name: 'Paciente Visitante', birth_date: '1990-05-10', company_id: 1 });
    expect(res.status).toBe(403);
  });

  it('atualiza, remove o CPF e exclui um paciente', async () => {
    const created = await request(ctx.app)
      .post('/api/patients')
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Paciente Ciclo', cpf: '39053344705', birth_date: '1985-07-20', company_id: 1 });
    const id = created.body.id;

    const updated = await request(ctx.app)
      .put(`/api/patients/${id}`)
      .set(auth(ctx.tokens.recepcao))
      .send({ name: 'Paciente Ciclo Atualizado', cpf: '', birth_date: '1985-07-20', company_id: 1 });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Paciente Ciclo Atualizado', cpf: null });

    const found = await request(ctx.app).get(`/api/patients/${id}`).set(auth(ctx.tokens.medico));
    expect(found.status).toBe(200);

    expect((await request(ctx.app).delete(`/api/patients/${id}`).set(auth(ctx.tokens.recepcao))).status).toBe(200);
    expect((await request(ctx.app).get(`/api/patients/${id}`).set(auth(ctx.tokens.recepcao))).status).toBe(404);
  });

  it('não expõe paciente de outra clínica', async () => {
    const res = await request(ctx.app).get('/api/patients/50').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(404);
    const del = await request(ctx.app).delete('/api/patients/50').set(auth(ctx.tokens.medico));
    expect(del.status).toBe(404);
  });
});
