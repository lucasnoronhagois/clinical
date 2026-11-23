import request from 'supertest';
import { auth, setupTestApp, TestContext } from '../helpers';

const futureDate = '2026-12-01T13:00:00.000Z';

describe('Atendimentos', () => {
  let ctx: TestContext;

  const create = (token: string, body: Record<string, unknown> = {}) =>
    request(ctx.app)
      .post('/api/attendances')
      .set(auth(token))
      .send({ user_id: 2, company_id: 1, patient_id: 1, place_id: 1, start_date: futureDate, ...body });

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('lista atendimentos com paciente, profissional e local, do mais recente ao mais antigo', async () => {
    const res = await request(ctx.app).get('/api/attendances').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(230);
    expect(res.body[0]).toHaveProperty('patient.name');
    expect(res.body[0]).toHaveProperty('user.name');
    expect(res.body[0]).toHaveProperty('place.name');
    const dates = res.body.map((a: { start_date: string }) => new Date(a.start_date).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('filtra por paciente e por período', async () => {
    const byPatient = await request(ctx.app).get('/api/attendances?patient_id=1').set(auth(ctx.tokens.medico));
    expect(byPatient.body.every((a: { patient_id: number }) => a.patient_id === 1)).toBe(true);

    const legacy = await request(ctx.app).get('/api/attendances?patientId=1').set(auth(ctx.tokens.medico));
    expect(legacy.body).toHaveLength(byPatient.body.length);

    const byRange = await request(ctx.app).get('/api/attendances?from=2026-03-01&to=2026-03-10').set(auth(ctx.tokens.medico));
    expect(byRange.body.length).toBeGreaterThan(0);
    byRange.body.forEach((a: { start_date: string }) => {
      expect(new Date(a.start_date).getTime()).toBeGreaterThanOrEqual(new Date('2026-03-01').getTime());
      expect(new Date(a.start_date).getTime()).toBeLessThanOrEqual(new Date('2026-03-10').getTime());
    });
  });

  it('recepcionista agenda e fica registrada como responsável', async () => {
    const res = await create(ctx.tokens.recepcao);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ receptionist_id: 5, user_id: 2, confirmed_at: null, end_date: null });
    expect(res.body.patient.name).toEqual(expect.any(String));
  });

  it('rejeita paciente, local ou profissional de outra clínica', async () => {
    const res = await create(ctx.tokens.recepcao, { patient_id: 50, place_id: 5, user_id: 8 });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual(['patient_id', 'place_id', 'user_id']);
  });

  it('valida campos obrigatórios', async () => {
    const res = await request(ctx.app).post('/api/attendances').set(auth(ctx.tokens.recepcao)).send({ start_date: 'ontem' });
    expect(res.status).toBe(400);
  });

  it('segue o fluxo agendado, confirmado e finalizado', async () => {
    const { body } = await create(ctx.tokens.recepcao);

    const early = await request(ctx.app).put(`/api/attendances/${body.id}/finish`).set(auth(ctx.tokens.medico));
    expect(early.status).toBe(409);

    const confirmed = await request(ctx.app).put(`/api/attendances/${body.id}/confirm`).set(auth(ctx.tokens.recepcao));
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toMatchObject({ confirmed_by: 5 });
    expect(confirmed.body.confirmed_at).not.toBeNull();

    const again = await request(ctx.app).put(`/api/attendances/${body.id}/confirm`).set(auth(ctx.tokens.recepcao));
    expect(again.status).toBe(409);

    const finished = await request(ctx.app).put(`/api/attendances/${body.id}/finish`).set(auth(ctx.tokens.medico));
    expect(finished.status).toBe(200);
    expect(finished.body.end_date).not.toBeNull();

    const twice = await request(ctx.app).put(`/api/attendances/${body.id}/finish`).set(auth(ctx.tokens.medico));
    expect(twice.status).toBe(409);

    const edit = await request(ctx.app)
      .put(`/api/attendances/${body.id}`)
      .set(auth(ctx.tokens.recepcao))
      .send({ user_id: 3, company_id: 1, patient_id: 1, place_id: 2, start_date: futureDate });
    expect(edit.status).toBe(409);
  });

  it('edita e exclui um atendimento agendado', async () => {
    const { body } = await create(ctx.tokens.recepcao);
    const edit = await request(ctx.app)
      .put(`/api/attendances/${body.id}`)
      .set(auth(ctx.tokens.recepcao))
      .send({ user_id: 3, company_id: 1, patient_id: 2, place_id: 2, start_date: futureDate });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ user_id: 3, patient_id: 2, place_id: 2 });

    expect((await request(ctx.app).delete(`/api/attendances/${body.id}`).set(auth(ctx.tokens.recepcao))).status).toBe(200);
    expect((await request(ctx.app).get(`/api/attendances/${body.id}`).set(auth(ctx.tokens.recepcao))).status).toBe(404);
  });

  it('visitante consulta mas não agenda', async () => {
    expect((await request(ctx.app).get('/api/attendances?company_id=1').set(auth(ctx.tokens.visitante))).status).toBe(200);
    expect((await create(ctx.tokens.visitante)).status).toBe(403);
  });


  it('recepção não finaliza e o médico só finaliza os próprios atendimentos', async () => {
    const { body } = await create(ctx.tokens.recepcao);
    const confirmed = await request(ctx.app).put(`/api/attendances/${body.id}/confirm`).set(auth(ctx.tokens.recepcao));
    expect(confirmed.status).toBe(200);

    const reception = await request(ctx.app).put(`/api/attendances/${body.id}/finish`).set(auth(ctx.tokens.recepcao));
    expect(reception.status).toBe(403);
    expect(reception.body.error).toBe('A recepção não pode finalizar atendimentos.');

    const otherDoctor = await request(ctx.app).put(`/api/attendances/${body.id}/finish`).set(auth(ctx.tokens['rafael.teixeira']));
    expect(otherDoctor.status).toBe(403);
    expect(otherDoctor.body.error).toBe('Você só pode finalizar os próprios atendimentos.');

    const owner = await request(ctx.app).put(`/api/attendances/${body.id}/finish`).set(auth(ctx.tokens.medico));
    expect(owner.status).toBe(200);
    expect(owner.body.end_date).not.toBeNull();
  });

  it('não expõe atendimento de outra clínica', async () => {
    const other = await request(ctx.app).get('/api/attendances?company_id=2').set(auth(ctx.tokens.admin));
    const res = await request(ctx.app).get(`/api/attendances/${other.body[0].id}`).set(auth(ctx.tokens.medico));
    expect(res.status).toBe(404);
  });
});
