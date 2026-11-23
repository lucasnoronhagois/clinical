import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TOKEN_KEY } from '../../lib/api';
import { renderApp, signIn } from '../utils';

describe('login', () => {
  it('valida campos vazios sem chamar a API', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe seu login ou email e a senha.')).toBeInTheDocument();
  });

  it('mostra o erro da API para credenciais inválidas', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText('Login ou email'), 'medico');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Usuário ou senha inválidos.')).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('entra com a conta de demonstração da médica e abre o dashboard da própria clínica', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(screen.getByRole('button', { name: /Médica/ }));
    expect(await screen.findByRole('heading', { name: 'Olá, Marina' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
    expect(await screen.findByText('Atendimentos no período')).toBeInTheDocument();
  });

  it('administrador escolhe a clínica antes de entrar no painel', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(screen.getByRole('button', { name: /Administrador/ }));
    const enter = await screen.findByRole('button', { name: 'Entrar na Centro Médico Bem Viver' });
    await user.click(enter);
    expect(await screen.findByRole('heading', { name: 'Olá, Admin' })).toBeInTheDocument();
    expect(screen.getAllByText('Centro Médico Bem Viver').length).toBeGreaterThan(0);
  });
});

describe('rotas protegidas', () => {
  it('redireciona visitantes não autenticados para o login', async () => {
    renderApp('/patients');
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });

  it('descarta tokens expirados', async () => {
    signIn({}, undefined);
    localStorage.setItem(TOKEN_KEY, 'x.eyJleHAiOjF9.y');
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });

  it('perfil sem permissão volta ao dashboard ao abrir a gestão de equipe', async () => {
    signIn();
    renderApp('/users');
    expect(await screen.findByRole('heading', { name: 'Olá, Marina' })).toBeInTheDocument();
  });

  it('administrador sem clínica selecionada vai para a seleção', async () => {
    signIn({ id: 1, name: 'Admin Demo', root: true });
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Escolha uma clínica' })).toBeInTheDocument();
  });

  it('exibe a página 404 para rotas desconhecidas', async () => {
    renderApp('/rota/inexistente');
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });

  it('encerra a sessão pelo menu do usuário', async () => {
    const user = userEvent.setup();
    signIn();
    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: /Dra. Marina Albuquerque/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));
    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeNull());
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });
});
