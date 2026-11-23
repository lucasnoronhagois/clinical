import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp, signIn } from '../utils';

describe('atendimentos', () => {
  it('confirma um atendimento agendado', async () => {
    const user = userEvent.setup();
    signIn({ id: 5, name: 'Carla Nogueira', role: 'RECEPTIONIST' });
    renderApp('/attendances');
    const [confirm] = await screen.findAllByRole('button', { name: 'Confirmar' });
    const before = screen.getAllByRole('button', { name: 'Confirmar' }).length;
    await user.click(confirm);
    expect(await screen.findByText('Atendimento confirmado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Confirmar' }).length).toBe(before - 1));
  });

  it('visitante não vê ações de escrita', async () => {
    signIn({ id: 7, name: 'Visitante Demo', role: 'GUEST' }, 1);
    renderApp('/attendances');
    expect(await screen.findByRole('note')).toBeInTheDocument();
    await screen.findAllByRole('row');
    expect(screen.queryByRole('button', { name: 'Novo atendimento' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: 'Confirmar' })).toHaveLength(0);
  });
});

describe('dashboard', () => {
  it('troca o período e atualiza os indicadores', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/dashboard');
    const card = (await screen.findByText('Atendimentos no período')).closest('.stat-card') as HTMLElement;
    await waitFor(() => expect(within(card).queryByText(/^\d+$/)).toBeInTheDocument());
    const longValue = Number(within(card).getByText(/^\d+$/).textContent);
    await user.click(screen.getByRole('button', { name: '12 meses' }));
    expect(screen.getByRole('button', { name: '12 meses' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(Number(within(card).getByText(/^\d+$/).textContent)).toBeGreaterThanOrEqual(longValue));
  });
});

describe('relatórios', () => {
  it('mostra o ranking de médicos e alterna para a recepção', async () => {
    const user = userEvent.setup();
    signIn({ id: 1, name: 'Admin Demo', root: true }, 1);
    renderApp('/reports');
    expect(await screen.findByText('Dra. Marina Albuquerque')).toBeInTheDocument();
    const ranking = screen.getByRole('heading', { name: 'Ranking' }).closest('.card') as HTMLElement;
    expect(within(ranking).queryByText('Admin Demo')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recepção' }));
    expect(await screen.findByText('Carla Nogueira')).toBeInTheDocument();
  });
});

describe('equipe', () => {
  it('administrador vê os profissionais da clínica', async () => {
    signIn({ id: 1, name: 'Admin Demo', root: true }, 1);
    renderApp('/users');
    expect(await screen.findByText('Diego Farias')).toBeInTheDocument();
    expect(screen.queryByText('Dr. Tiago Moreira')).not.toBeInTheDocument();
  });
});
