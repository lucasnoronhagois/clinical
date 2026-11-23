import { HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand({ to = '/dashboard' }: { to?: string }) {
  return (
    <Link to={to} className="brand" aria-label="ClinicalCare, ir para o início">
      <span className="brand-mark" aria-hidden>
        <HeartPulse />
      </span>
      <span>
        Clinical<em>Care</em>
      </span>
    </Link>
  );
}
