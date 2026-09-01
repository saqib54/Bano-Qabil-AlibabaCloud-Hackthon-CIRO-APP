import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Placeholder screen for modules delivered in later sprints.
 * Keeps the navigation honest without faking functionality.
 */
export default function ComingSoon({ feature, sprint }) {
  const navigate = useNavigate();

  return (
    <div className="card mx-auto mt-10 max-w-lg p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Construction className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-xl font-bold">{feature}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        This module ships in <span className="font-semibold text-ink">{sprint}</span> of the CIRO
        build roadmap. The foundation, authentication and role-based access are already live.
      </p>
      <button onClick={() => navigate(-1)} className="btn-secondary mt-6">
        <ArrowLeft className="h-4 w-4" />
        Go back
      </button>
    </div>
  );
}
