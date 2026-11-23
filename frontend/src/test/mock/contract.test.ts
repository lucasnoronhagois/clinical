/**
 * Contrato da API interna de demonstração, exercitado pelo mesmo cliente HTTP (axios) usado pelas telas.
 * As expectativas espelham as respostas da API Node (backend/tests/integration).
 */
import axios from 'axios';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api, API_BASE_URL, getErrorMessage, TOKEN_KEY } from '../../lib/api';
import { MOCK_API_BASE } from '../../mock/config';
import { createHandlers } from '../../mock/handlers';
import { createMockStore } from '../../mock/store';
import { server } from '../server';

async function loginAs(login: string) {
  const { data } = await api.post('/auth/login', { email_or_login: login, password: 'demo123' });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data as { token: string; user: { id: number; company_id: number } };
}

const statusOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 200;
  } catch (error) {
    if (axios.isAxiosError(error)) return { status: error.response?.status, body: error.response?.data };
    throw error;
  }
};

describe('API interna: configuração', () => {
  it('usa /mock-api como URL base padrão', () => {
    expect(API_BASE_URL).toBe(MOCK_API_BASE);
    expect(api.defaults.baseURL).toBe('/mock-api/api');
  });

  it('responde ao health check', async () => {
    const { data, status } = await api.get('/health');
    expect(status).toBe(200);
    expect(data).toMatchObject({ status: 'ok', service: 'clinicalcare-mock-api' });
  });

  it('retorna 404 em JSON para rotas desconhecidas', async () => {
    expect(await statusOf(api.get('/nao-existe'))).toEqual({ status: 404, body: { error: 'Rota GET /api/nao-existe não encontrada.' } });
  });

  it('simula latência quando configurada', async () => {
    server.resetHandlers(...createHandlers({ store: createMockStore(), latency: 60 }));
    const started = performance.now();
    await api.get('/health');
    expect(performance.now() - started).toBeGreaterThanOrEqual(50);
  });

  it('rejeita JSON malformado com 400', async () => {
    const response = await fetch('http://localhost/mock-api/api/auth/login', {
      method: 'POST',
      body: '{oops',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'JSON inválido no corpo da requisição.' });
  });
});

describe('API interna: autenticação', () => {
  it('emite token JWT com os dados do usuário e não expõe senha', async () => {
    const { token, user } = await loginAs('medico');
    expect(token.split('.')).toHaveLength(3);
    expect(user).toMatchObject({ login: 'medico', role: 'DOCTOR', root: false });
    expect(user).not.toHaveProperty('password');
  });

  it('aceita email e recusa credenciais inválidas com 401', async () => {
    await expect(api.post('/auth/login', { email_or_login: 'MEDICO@clinicalcare.example', password: 'demo123' })).resolves.toBeTruthy();
    const result = await statusOf(api.post('/auth/login', { email_or_login: 'medico', password: 'errada' }));
    expect(result).toEqual({ status: 401, body: { error: 'Usuário ou senha inválidos.' } });
  });

  it('valida campos obrigatórios com detalhes por campo', async () => {
    const result = await statusOf(api.post('/auth/login', {}));
    expect(result).toMatchObject({ status: 400, body: { error: 'Dados inválidos', details: [{ field: 'email_or_login' }, { field: 'password' }] } });
  });

  it('exige token nas rotas protegidas', async () => {
    expect(await statusOf(api.get('/patients'))).toEqual({ status: 401, body: { error: 'Token não fornecido.' } });
    localStorage.setItem(TOKEN_KEY, 'a.b.c');
    expect(await statusOf(api.get('/patients'))).toEqual({ status: 401, body: { error: 'Sessão expirada ou token inválido.' } });
  });

  it('retorna o perfil e altera a senha', async () => {
    await loginAs('recepcao');
    const { data: me } = await api.get('/auth/me');
    expect(me.login).toBe('recepcao');
    expect(await statusOf(api.post('/auth/change-password', { currentPassword: 'x', newPassword: 'nova123' }))).toMatchObject({ status: 400 });
    await api.post('/auth/change-password', { currentPassword: 'demo123', newPassword: 'nova123' });
    await expect(api.post('/auth/login', { email_or_login: 'recepcao', password: 'nova123' })).resolves.toBeTruthy();
  });
});

describe('API interna: escopo por clínica e perfis', () => {
  it('perfis da equipe enxergam apenas a própria clínica', async () => {
    await loginAs('tiago.moreira');
    const { data: patients } = await api.get('/patients', { params: { company_id: 1 } });
    expect(patients.length).toBe(16);
    expect(patients.every((p: { company_id: number }) => p.company_id === 2)).toBe(true);
    const { data: companies } = await api.get('/companies');
    expect(companies).toHaveLength(1);
  });

  it('responde 404 ao acessar registro de outra clínica', async () => {
    await loginAs('medico');
    const { data: others } = await api.get('/patients', { params: { company_id: 2 } });
    expect(others.every((p: { company_id: number }) => p.company_id === 1)).toBe(true);
    expect(await statusOf(api.get('/patients/50'))).toEqual({ status: 404, body: { error: 'Paciente não encontrado.' } });
  });

  it('visitante lê todas as clínicas, mas não escreve nem vê a equipe', async () => {
    await loginAs('visitante');
    const { data } = await api.get('/companies');
    expect(data).toHaveLength(2);
    expect(await statusOf(api.post('/patients', { name: 'Teste', birth_date: '2000-01-01', company_id: 1 }))).toMatchObject({ status: 403 });
    expect(await statusOf(api.get('/users', { params: { company_id: 1 } }))).toMatchObject({ status: 403 });
  });

  it('exige company_id para perfis multiclínica no dashboard', async () => {
    await loginAs('admin');
    expect(await statusOf(api.get('/dashboard/statistics'))).toEqual({ status: 400, body: { error: 'company_id é obrigatório.' } });
  });

  it('apenas administradores gerenciam usuários e clínicas', async () => {
    await loginAs('medico');
    expect(await statusOf(api.delete('/companies/1'))).toMatchObject({ status: 403, body: { error: 'Acesso permitido apenas para administradores.' } });
    expect(await statusOf(api.post('/users', {}))).toMatchObject({ status: 403 });
  });
});

describe('API interna: recursos', () => {
  it('lista pacientes ordenados e busca por nome ou CPF', async () => {
    await loginAs('medico');
    const { data } = await api.get('/patients', { params: { company_id: 1 } });
    expect(data).toHaveLength(42);
    const names = data.map((p: { name: string }) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    const withCpf = data.find((p: { cpf: string | null }) => p.cpf);
    const { data: byCpf } = await api.get('/patients', { params: { search: withCpf.cpf.slice(0, 6) } });
    expect(byCpf.map((p: { id: number }) => p.id)).toContain(withCpf.id);
  });

  it('cria, edita e exclui pacientes com validação', async () => {
    await loginAs('recepcao');
    const invalid = await statusOf(api.post('/patients', { name: 'Al', cpf: '11111111111', birth_date: '2999-01-01' }));
    expect(invalid).toMatchObject({
      status: 400,
      body: { details: expect.arrayContaining([expect.objectContaining({ field: 'cpf' }), expect.objectContaining({ field: 'name' })]) },
    });

    const { data: created, status } = await api.post('/patients', { name: 'Paciente Fictício', cpf: '529.982.247-25', birth_date: '1990-05-20' });
    expect(status).toBe(201);
    expect(created).toMatchObject({ name: 'Paciente Fictício', cpf: '52998224725', company_id: 1 });

    const { data: updated } = await api.put(`/patients/${created.id}`, { name: 'Paciente Editado', cpf: '' });
    expect(updated).toMatchObject({ name: 'Paciente Editado', cpf: null });

    await expect(api.delete(`/patients/${created.id}`)).resolves.toMatchObject({ data: { message: 'Paciente excluído.' } });
    expect(await statusOf(api.get(`/patients/${created.id}`))).toMatchObject({ status: 404 });
  });

  it('segue o fluxo agendado, confirmado e finalizado', async () => {
    const { user } = await loginAs('recepcao');
    const { data: created } = await api.post('/attendances', { patient_id: 1, user_id: 2, place_id: 1, start_date: '2030-01-10T13:00:00.000Z' });
    expect(created).toMatchObject({ receptionist_id: user.id, confirmed_at: null, end_date: null, patient: { id: 1 }, user: { id: 2 }, place: { id: 1 } });

    await loginAs('medico');
    expect(await statusOf(api.put(`/attendances/${created.id}/finish`))).toMatchObject({
      status: 409,
      body: { error: 'Confirme o atendimento antes de finalizar.' },
    });

    await loginAs('recepcao');
    const { data: confirmed } = await api.put(`/attendances/${created.id}/confirm`);
    expect(confirmed.confirmed_at).toBeTruthy();
    expect(await statusOf(api.put(`/attendances/${created.id}/confirm`))).toMatchObject({ status: 409 });

    await loginAs('medico');
    const { data: finished } = await api.put(`/attendances/${created.id}/finish`);
    expect(finished.end_date).toBeTruthy();
    expect(
      await statusOf(api.put(`/attendances/${created.id}`, { patient_id: 1, user_id: 2, place_id: 1, start_date: '2030-01-11T13:00:00.000Z' })),
    ).toMatchObject({
      status: 409,
    });
  });

  it('impede a recepção de finalizar e o médico de finalizar atendimento de outro profissional', async () => {
    await loginAs('recepcao');
    const { data: created } = await api.post('/attendances', { patient_id: 1, user_id: 2, place_id: 1, start_date: '2030-02-10T13:00:00.000Z' });
    await api.put(`/attendances/${created.id}/confirm`);

    expect(await statusOf(api.put(`/attendances/${created.id}/finish`))).toEqual({
      status: 403,
      body: { error: 'A recepção não pode finalizar atendimentos.' },
    });

    await loginAs('rafael.teixeira');
    expect(await statusOf(api.put(`/attendances/${created.id}/finish`))).toEqual({
      status: 403,
      body: { error: 'Você só pode finalizar os próprios atendimentos.' },
    });

    await loginAs('visitante');
    expect(await statusOf(api.put(`/attendances/${created.id}/finish`))).toEqual({
      status: 403,
      body: { error: 'Usuários visitantes podem apenas visualizar dados.' },
    });

    await loginAs('admin');
    const { data: finished } = await api.put(`/attendances/${created.id}/finish`);
    expect(finished.end_date).toBeTruthy();
  });

  it('recusa relacionamentos de outra clínica', async () => {
    await loginAs('recepcao');
    const result = await statusOf(api.post('/attendances', { patient_id: 50, user_id: 8, place_id: 5, start_date: '2030-01-10T13:00:00.000Z' }));
    expect(result).toMatchObject({ status: 400, body: { details: [{ field: 'patient_id' }, { field: 'place_id' }, { field: 'user_id' }] } });
  });

  it('filtra atendimentos por paciente em ordem decrescente', async () => {
    await loginAs('medico');
    const { data } = await api.get('/attendances', { params: { patient_id: 3 } });
    expect(data.every((a: { patient_id: number }) => a.patient_id === 3)).toBe(true);
    const dates = data.map((a: { start_date: string }) => a.start_date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('gerencia locais', async () => {
    await loginAs('medico');
    const { data: place } = await api.post('/places', { name: 'Sala 9' });
    expect(place).toMatchObject({ name: 'Sala 9', company_id: 1 });
    expect((await api.put(`/places/${place.id}`, { name: 'Sala 10' })).data.name).toBe('Sala 10');
    expect(await statusOf(api.put(`/places/${place.id}`, { name: '' }))).toMatchObject({ status: 400 });
    await api.delete(`/places/${place.id}`);
  });

  it('administra usuários com unicidade e sem excluir a si mesmo', async () => {
    const { user: admin } = await loginAs('admin');
    const { data: list } = await api.get('/users', { params: { company_id: 1, role: 'DOCTOR' } });
    expect(list.users.every((u: { role: string }) => u.role === 'DOCTOR')).toBe(true);

    const duplicate = await statusOf(
      api.post('/users', {
        name: 'X',
        email: 'novo@clinicalcare.example',
        login: 'medico',
        cpf: '52998224725',
        password: 'senha123',
        role: 'DOCTOR',
        company_id: 1,
      }),
    );
    expect(duplicate).toMatchObject({ status: 409, body: { details: [{ field: 'login' }] } });

    const { data: created } = await api.post('/users', {
      name: 'Novo Profissional',
      email: 'novo@clinicalcare.example',
      login: 'novo.prof',
      cpf: '52998224725',
      password: 'senha123',
      role: 'RECEPTIONIST',
      company_id: 1,
    });
    expect(created).not.toHaveProperty('password');
    expect((await api.put(`/users/${created.id}`, { name: 'Nome Atualizado' })).data.name).toBe('Nome Atualizado');
    expect(await statusOf(api.delete(`/users/${admin.id}`))).toMatchObject({ status: 400, body: { error: 'Você não pode excluir o próprio usuário.' } });
    await api.delete(`/users/${created.id}`);
  });

  it('cria e edita clínicas como administrador', async () => {
    await loginAs('admin');
    const payload = {
      name: 'Clínica Teste',
      email: 'teste@clinica.example',
      zip_code: '50000-100',
      adress_street: 'Rua A',
      adress_number: '1',
      adress_neighborhood: 'Centro',
      adress_city: 'Recife',
      adress_state: 'pe',
    };
    const { data: company, status } = await api.post('/companies', payload);
    expect(status).toBe(201);
    expect(company).toMatchObject({ zip_code: '50000100', adress_state: 'PE', adress_complement: null });
    expect(await statusOf(api.put(`/companies/${company.id}`, { ...payload, zip_code: '1' }))).toMatchObject({ status: 400 });
    await api.delete(`/companies/${company.id}`);
    expect((await api.get('/companies')).data).toHaveLength(2);
  });
});

describe('API interna: indicadores', () => {
  it('monta estatísticas do dashboard com o mesmo formato da API Node', async () => {
    await loginAs('medico');
    const { data } = await api.get('/dashboard/statistics', { params: { start_date: '2000-01-01', end_date: '2100-01-01' } });
    expect(Object.keys(data).sort()).toEqual(
      [
        'attendancesByPlace',
        'attendancesByProfessional',
        'attendancesByStatus',
        'details',
        'period',
        'totalAttendances',
        'totalPatients',
        'totalPlaces',
        'totalUsers',
        'upcomingAttendances',
      ].sort(),
    );
    expect(data).toMatchObject({ totalPatients: 42, totalAttendances: 230, totalPlaces: 4, totalUsers: 7 });
    const { scheduled, confirmed, finished } = data.attendancesByStatus;
    expect(scheduled + confirmed + finished).toBe(230);
    expect(data.upcomingAttendances.length).toBeLessThanOrEqual(5);
    expect(data.attendancesByProfessional.length).toBeLessThanOrEqual(5);
    expect(await statusOf(api.get('/dashboard/statistics', { params: { start_date: '2026-02-01', end_date: '2026-01-01' } }))).toMatchObject({ status: 400 });
  });

  it('gera relatório por perfil e ignora administradores sem atendimentos', async () => {
    await loginAs('admin');
    const { data: doctors } = await api.get('/reports/attendances', { params: { company_id: 1 } });
    expect(doctors.map((r: { name: string }) => r.name)).not.toContain('Admin Demo');
    expect(doctors.reduce((sum: number, r: { total_attendances: number }) => sum + r.total_attendances, 0)).toBe(230);
    const { data: reception } = await api.get('/reports/attendances', { params: { company_id: 1, role: 'RECEPTIONIST' } });
    expect(reception.every((r: { role: string }) => r.role === 'RECEPTIONIST')).toBe(true);
  });
});

describe('troca para a API real', () => {
  it('basta mudar VITE_API_URL: o mesmo cliente passa a chamar a nova origem', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.clinicalcare.example/');
    vi.resetModules();
    const real = await import('../../lib/api');
    expect(real.API_BASE_URL).toBe('https://api.clinicalcare.example');
    server.use(http.get('https://api.clinicalcare.example/api/health', () => HttpResponse.json({ status: 'ok', service: 'clinicalcare-api' })));
    const { data } = await real.api.get('/health');
    expect(data.service).toBe('clinicalcare-api');
    vi.unstubAllEnvs();
  });

  it('propaga erros da API com a mensagem do contrato', async () => {
    server.use(http.get('*/mock-api/api/health', () => HttpResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })));
    const error = await api.get('/health').catch((err: unknown) => err);
    expect(getErrorMessage(error)).toBe('Erro interno do servidor.');
  });
});
