import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../server';
import { renderApp, signIn } from '../utils';

describe('pacientes', () => {
  it('lista os pacientes da clínica e filtra pela busca', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/patients');
    expect(await screen.findByText('Mostrando 1 a 20 de 42')).toBeInTheDocument();
    const firstRow = screen.getAllByRole('row')[1];
    const name = within(firstRow).getAllByRole('cell')[0].textContent ?? '';
    const term = name.split(' ')[0];
    await user.type(screen.getByLabelText('Buscar pacientes'), term);
    await waitFor(() => expect(screen.queryByText('Mostrando 1 a 20 de 42')).not.toBeInTheDocument());
    await user.clear(screen.getByLabelText('Buscar pacientes'));
    await user.type(screen.getByLabelText('Buscar pacientes'), 'zzzz');
    expect(await screen.findByText('Nenhum paciente encontrado')).toBeInTheDocument();
  });

  it('valida e cadastra um paciente pela API', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/patients');
    await screen.findByText('Mostrando 1 a 20 de 42');
    await user.click(screen.getByRole('button', { name: 'Novo paciente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo paciente' });
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar paciente' }));
    expect(await within(dialog).findByText('Informe o nome do paciente.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Nome completo'), 'Paciente de Teste');
    await user.type(within(dialog).getByLabelText(/CPF/), '52998224725');
    await user.type(within(dialog).getByLabelText('Data de nascimento'), '1990-05-20');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar paciente' }));

    expect(await screen.findByText('Paciente cadastrado.')).toBeInTheDocument();
    expect(await screen.findByText('Mostrando 1 a 20 de 43')).toBeInTheDocument();
  });

  it('exclui um paciente após confirmação', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/patients');
    await screen.findByText('Mostrando 1 a 20 de 42');
    const [deleteButton] = screen.getAllByRole('button', { name: /^Excluir / });
    await user.click(deleteButton);
    const dialog = await screen.findByRole('dialog', { name: 'Excluir paciente?' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir paciente' }));
    expect(await screen.findByText('Paciente excluído.')).toBeInTheDocument();
    expect(await screen.findByText('Mostrando 1 a 20 de 41')).toBeInTheDocument();
  });

  it('visitante navega em modo somente leitura', async () => {
    signIn({ id: 7, name: 'Visitante Demo', role: 'GUEST' }, 1);
    renderApp('/patients');
    expect(await screen.findByText('Mostrando 1 a 20 de 42')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Modo visitante.');
    expect(screen.queryByRole('button', { name: 'Novo paciente' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Excluir / })).toHaveLength(0);
  });

  it('mostra estado de erro e permite tentar novamente', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get('*/mock-api/api/patients', () => {
        calls += 1;
        return calls === 1 ? HttpResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 }) : HttpResponse.json([]);
      }),
    );
    signIn();
    renderApp('/patients');
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum paciente cadastrado')).toBeInTheDocument();
  });

  it('abre o histórico do paciente', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/patients');
    await screen.findByText('Mostrando 1 a 20 de 42');
    const [view] = screen.getAllByRole('button', { name: /^Ver / });
    const name = view.getAttribute('aria-label')!.replace('Ver ', '');
    await user.click(view);
    expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
    expect(await screen.findByText('Histórico de atendimentos')).toBeInTheDocument();
  });

  it('pagina a lista, troca o tamanho da página e volta à primeira ao buscar', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/patients');
    expect(await screen.findByText('Mostrando 1 a 20 de 42')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    const dataRows = () => screen.getAllByRole('row').slice(1);
    expect(dataRows()).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(await screen.findByText('Mostrando 21 a 40 de 42')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(dataRows()).toHaveLength(20);

    await user.selectOptions(screen.getByLabelText('Itens por página'), '50');
    expect(await screen.findByText('Mostrando 1 a 42 de 42')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
    expect(dataRows()).toHaveLength(42);

    await user.selectOptions(screen.getByLabelText('Itens por página'), '20');
    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(await screen.findByText('Mostrando 21 a 40 de 42')).toBeInTheDocument();
    const nameOnPage2 = within(dataRows()[0]).getByRole('button', { name: /^Ver / }).getAttribute('aria-label')!.replace('Ver ', '');
    await user.type(screen.getByLabelText('Buscar pacientes'), nameOnPage2);
    expect(await screen.findByText('Mostrando 1 a 1 de 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
  });
});
