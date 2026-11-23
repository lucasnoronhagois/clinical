import { motion } from 'motion/react';
import { CalendarCheck, ChartColumn, LogIn, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Brand } from '../components/layout/Brand';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { Button, Field, PasswordInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../lib/api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../lib/demo';
import { canSwitchCompany } from '../lib/permissions';

const features = [
  { icon: <CalendarCheck />, title: 'Agenda inteligente', text: 'Fluxo agendado, confirmado e finalizado' },
  { icon: <Users />, title: 'Multiclínica', text: 'Dados isolados por clínica' },
  { icon: <ShieldCheck />, title: 'Perfis de acesso', text: 'Admin, médico, recepção e visitante' },
  { icon: <ChartColumn />, title: 'Indicadores', text: 'Dashboard e relatórios por profissional' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

export default function Login() {
  useDocumentTitle('Entrar');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={canSwitchCompany(user) ? '/select-company' : '/dashboard'} replace />;

  const authenticate = async (id: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const session = await login(id, pass);
      navigate(canSwitchCompany(session) ? '/select-company' : '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível entrar.'));
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Informe seu login ou email e a senha.');
      return;
    }
    void authenticate(identifier.trim(), password);
  };

  return (
    <div className="auth-page">
      <ThemeToggle className="auth-theme-toggle" />
      <section className="auth-hero" aria-label="Sobre o ClinicalCare">
        <div className="auth-hero-grid" aria-hidden />
        <Brand to="/login" />
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.h1 variants={item}>
            Gestão clínica <span>simples, segura e em tempo real</span>
          </motion.h1>
          <motion.p variants={item}>Agenda, pacientes, equipe e indicadores de várias clínicas em um só lugar.</motion.p>
        </motion.div>
        <motion.div className="auth-features" variants={container} initial="hidden" animate="show">
          {features.map((feature) => (
            <motion.div key={feature.title} className="auth-feature" variants={item}>
              {feature.icon}
              <div>
                <strong>{feature.title}</strong>
                <small>{feature.text}</small>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="auth-panel">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2>Bem-vindo de volta</h2>
          <p>Entre com seu login ou email para acessar o painel.</p>

          <form className="auth-form" onSubmit={submit} noValidate>
            {error && (
              <div className="alert alert-danger" role="alert">
                <TriangleAlert aria-hidden />
                <span>{error}</span>
              </div>
            )}
            <Field label="Login ou email">
              <input
                className="input"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ex.: medico"
                autoFocus
              />
            </Field>
            <Field label="Senha">
              <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" />
            </Field>
            <Button type="submit" variant="primary" block loading={loading} icon={<LogIn />}>
              Entrar
            </Button>
          </form>

          <div className="demo-accounts">
            <h3>Contas de demonstração</h3>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.login}
                  type="button"
                  className="demo-account"
                  disabled={loading}
                  onClick={() => {
                    setIdentifier(account.login);
                    setPassword(DEMO_PASSWORD);
                    void authenticate(account.login, DEMO_PASSWORD);
                  }}
                >
                  <strong>{account.label}</strong>
                  <small>
                    {account.login} · {account.description}
                  </small>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
