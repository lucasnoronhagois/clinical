import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { ConfirmDialog, EmptyState, Field, StatusBadge } from '../../components/ui';
import { renderWithProviders } from '../utils';

describe('componentes de interface', () => {
  it('ConfirmDialog confirma, cancela e fecha com Esc', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Excluir item?" description="Esta ação não pode ser desfeita." onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog', { name: 'Excluir item?' });
    expect(dialog).toHaveAccessibleDescription('Esta ação não pode ser desfeita.');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus());
  });

  it('Field associa rótulo, erro e campo', () => {
    render(
      <Field label="Nome" error="Campo obrigatório.">
        <input className="input" />
      </Field>,
    );
    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Campo obrigatório.');
  });

  it('StatusBadge e EmptyState exibem textos acessíveis', () => {
    render(
      <>
        <StatusBadge status="finished" />
        <EmptyState title="Nada por aqui" description="Cadastre o primeiro registro." />
      </>,
    );
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
    expect(screen.getByText('Nada por aqui')).toBeInTheDocument();
  });

  it('ThemeToggle alterna e persiste o tema', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('clinicalcare.theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
  });
});
