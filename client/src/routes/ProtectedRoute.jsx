import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ROLE_HOME } from '../constants/roles';
import { Loader2 } from 'lucide-react';

/**
 * Route guard: requires a session and (optionally) specific roles.
 * The backend always re-validates the token and role on every request.
 */
export default function ProtectedRoute({ roles }) {
  const { user, accessToken } = useAuthStore();

  if (!user || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
  }

  return <Outlet />;
}

export function FullPageLoader({ label = 'Loading CIRO…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex items-center gap-3 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin text-brand" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}
