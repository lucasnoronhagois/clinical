import { Lock } from 'lucide-react';

export function ReadOnlyBanner() {
  return (
    <div className="alert alert-warning readonly-banner" role="note">
      <Lock aria-hidden />
      <span>
        <strong>Modo visitante.</strong> Você pode navegar e consultar os dados, mas não pode criar, editar ou excluir registros.
      </span>
    </div>
  );
}
