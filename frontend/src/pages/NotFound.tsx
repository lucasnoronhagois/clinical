import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Página não encontrada');
  return (
    <main className="not-found">
      <div>
        <strong>404</strong>
        <h1 className="page-title">Página não encontrada</h1>
        <p className="page-description" style={{ margin: '8px auto 24px' }}>
          O endereço acessado não existe ou foi movido.
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft /> Voltar ao início
        </Link>
      </div>
    </main>
  );
}
