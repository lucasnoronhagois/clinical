import request from 'supertest';
import { auth, FIXED_NOW, setupTestApp, TestContext } from '../helpers';

describe('Dashboard e relatórios', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('administrador precisa informar a clínica', async () => {
    const res = await request(ctx.app).get('/api/dashboard/statistics').set(auth(ctx.tokens.admin));
    expect(res.status).toBe(400);
  });

  it('retorna totais, distribuição por status e séries diárias', async () => {
    const res = await request(ctx.app).get('/api/dashboard/statistics').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalPatients: 42, totalAttendances: 230, totalUsers: 7, totalPlaces: 4 });

    const { scheduled, confirmed, finished } = res.body.attendancesByStatus;
    expect(scheduled + confirmed + finished).toBe(230);

    const perDay = Object.values(res.body.details.attendances_by_day as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(perDay).toBe(230);

    const perPlace = res.body.attendancesByPlace.reduce((acc: number, item: { count: number }) => acc + item.count, 0);
    expect(perPlace).toBe(230);
    expect(res.body.attendancesByProfessional.length).toBeLessThanOrEqual(5);
  });

  it('lista os próximos atendimentos em ordem cronológica', async () => {
    const res = await request(ctx.app).get('/api/dashboard/statistics').set(auth(ctx.tokens.medico));
    const upcoming = res.body.upcomingAttendances as Array<{ start_date: string; status: string; patient: { name: string } }>;
    expect(upcoming.length).toBeLessThanOrEqual(5);
    const dates = upcoming.map((a) => new Date(a.start_date).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
    upcoming.forEach((a) => {
      expect(a.status).not.toBe('finished');
      expect(a.patient.name).toEqual(expect.any(String));
    });
  });

  it('filtra pelo período informado', async () => {
    const res = await request(ctx.app)
      .get('/api/dashboard/statistics?start_date=2026-02-01&end_date=2026-02-28')
      .set(auth(ctx.tokens.medico));
    expect(res.body.period).toEqual({ start_date: '2026-02-01', end_date: '2026-02-28' });
    Object.keys(res.body.details.attendances_by_day).forEach((day) => {
      expect(day >= '2026-02-01' && day <= '2026-02-28').toBe(true);
    });
  });

  it('rejeita período invertido ou datas inválidas', async () => {
    const inverted = await request(ctx.app)
      .get('/api/dashboard/statistics?start_date=2026-03-10&end_date=2026-03-01')
      .set(auth(ctx.tokens.medico));
    expect(inverted.status).toBe(400);
    const invalid = await request(ctx.app).get('/api/dashboard/statistics?start_date=abc').set(auth(ctx.tokens.medico));
    expect(invalid.status).toBe(400);
  });

  it('relatório de médicos ordenado por volume de atendimentos', async () => {
    const res = await request(ctx.app).get('/api/reports/attendances').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(200);
    expect(res.body.every((row: { role: string }) => row.role === 'DOCTOR')).toBe(true);
    expect(res.body.find((row: { name: string }) => row.name === 'Admin Demo')).toBeUndefined();
    const totals = res.body.map((row: { total_attendances: number }) => row.total_attendances);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(totals.reduce((a: number, b: number) => a + b, 0)).toBe(230);
  });

  it('relatório de recepcionistas conta os agendamentos feitos por elas', async () => {
    const res = await request(ctx.app).get('/api/reports/attendances?role=RECEPTIONIST').set(auth(ctx.tokens.admin)).query({ company_id: 1 });
    expect(res.body.map((row: { role: string }) => row.role)).toEqual(['RECEPTIONIST', 'RECEPTIONIST']);
    expect(res.body.reduce((acc: number, row: { total_attendances: number }) => acc + row.total_attendances, 0)).toBe(230);
  });

  it('relatório geral e por período', async () => {
    const all = await request(ctx.app).get('/api/reports/attendances?role=ALL').set(auth(ctx.tokens.medico));
    expect(all.body.length).toBe(5);
    const period = await request(ctx.app)
      .get(`/api/reports/attendances?start_date=${FIXED_NOW.toISOString().slice(0, 10)}&end_date=${FIXED_NOW.toISOString().slice(0, 10)}`)
      .set(auth(ctx.tokens.medico));
    expect(period.status).toBe(200);
  });

  it('rejeita perfil inválido no relatório', async () => {
    const res = await request(ctx.app).get('/api/reports/attendances?role=GUEST').set(auth(ctx.tokens.medico));
    expect(res.status).toBe(400);
  });
});
