import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../lib/queryClient';
import { fetchPatients, invalidateAfterAttendanceChange, invalidateAfterPatientChange } from '../../lib/queryApi';
import { queryKeys } from '../../lib/queryKeys';
import { server } from '../server';
import { renderApp, signIn } from '../utils';

describe('cache de consultas', () => {
  it('reabre a lista de pacientes sem o esqueleto de carregamento', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/patients');
    expect(await screen.findByText('Mostrando 1 a 20 de 42')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Atendimentos' }));
    expect(await screen.findByRole('heading', { name: 'Atendimentos' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Pacientes' }));
    expect(await screen.findByText('Mostrando 1 a 20 de 42')).toBeInTheDocument();
    expect(screen.queryByLabelText('Carregando')).not.toBeInTheDocument();
  });

  it('atualiza o cache depois de cadastrar um paciente', async () => {
    const user = userEvent.setup();
    const client = createQueryClient();
    signIn();
    renderApp('/patients', client);
    await screen.findByText('Mostrando 1 a 20 de 42');
    await user.click(screen.getByRole('button', { name: 'Novo paciente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo paciente' });
    await user.type(within(dialog).getByLabelText('Nome completo'), 'Paciente Cache');
    await user.type(within(dialog).getByLabelText('Data de nascimento'), '1990-05-20');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar paciente' }));
    expect(await screen.findByText('Paciente cadastrado.')).toBeInTheDocument();
    expect(await screen.findByText('Mostrando 1 a 20 de 43')).toBeInTheDocument();
    await waitFor(() => expect(client.getQueryData(queryKeys.patients.list(1))).toHaveLength(43));
  });

  it('esvazia o cache ao encerrar a sessão', async () => {
    const user = userEvent.setup();
    const client = createQueryClient();
    signIn();
    await client.prefetchQuery({ queryKey: queryKeys.patients.list(1), queryFn: () => fetchPatients(1) });
    expect(client.getQueryData(queryKeys.patients.list(1))).toHaveLength(42);
    renderApp('/dashboard', client);
    await user.click(await screen.findByRole('button', { name: /Dra. Marina Albuquerque/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it('esvazia o cache ao trocar de clínica', async () => {
    const user = userEvent.setup();
    const client = createQueryClient();
    signIn({ id: 1, name: 'Admin Demo', root: true, role: 'DOCTOR' }, 1);
    renderApp('/patients', client);
    expect(await screen.findByText('Mostrando 1 a 20 de 42')).toBeInTheDocument();
    expect(client.getQueryData(queryKeys.patients.list(1))).toHaveLength(42);

    await user.click(screen.getByTitle('Trocar de clínica'));
    expect(await screen.findByRole('heading', { name: 'Escolha uma clínica' })).toBeInTheDocument();
    expect(client.getQueryData(queryKeys.patients.list(1))).toBeUndefined();

    await user.click(await screen.findByRole('button', { name: 'Entrar na Centro Médico Bem Viver' }));
    await user.click(await screen.findByRole('link', { name: 'Pacientes' }));
    expect(await screen.findByText('Mostrando 1 a 16 de 16')).toBeInTheDocument();
    expect(client.getQueryData(queryKeys.patients.list(1))).toBeUndefined();
    expect(client.getQueryData(queryKeys.patients.list(2))).toHaveLength(16);
  });

  it('não dispara requisição de telas que não foram abertas', async () => {
    const paths: string[] = [];
    const onRequest = ({ request }: { request: Request }) => {
      paths.push(new URL(request.url).pathname);
    };
    server.events.on('request:start', onRequest);
    try {
      signIn();
      renderApp('/patients');
      expect(await screen.findByText('Mostrando 1 a 20 de 42')).toBeInTheDocument();
      expect(paths.some((path) => path.includes('/patients'))).toBe(true);
      expect(paths.some((path) => path.includes('/attendances'))).toBe(false);
      expect(paths.some((path) => path.includes('/dashboard'))).toBe(false);
      expect(paths.some((path) => path.includes('/places'))).toBe(false);
      expect(paths.some((path) => path.includes('/reports'))).toBe(false);
      expect(paths.some((path) => path.includes('/users'))).toBe(false);
    } finally {
      server.events.removeListener('request:start', onRequest);
    }
  });

  it('invalida painel, relatórios, agenda e a ficha do paciente nas mutações', () => {
    const client = createQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');

    invalidateAfterAttendanceChange(client, { patient_id: 3 });
    const attendanceKeys = spy.mock.calls.map((call) => (call[0] as { queryKey?: unknown })?.queryKey);
    expect(attendanceKeys).toEqual(
      expect.arrayContaining([queryKeys.attendances.all, queryKeys.dashboard.all, queryKeys.reports.all, queryKeys.patients.detail(3)]),
    );

    spy.mockClear();
    invalidateAfterPatientChange(client);
    const patientKeys = spy.mock.calls.map((call) => (call[0] as { queryKey?: unknown })?.queryKey);
    expect(patientKeys).toEqual(expect.arrayContaining([queryKeys.patients.all, queryKeys.attendances.all, queryKeys.dashboard.all, queryKeys.reports.all]));
  });
});
