import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  roles?: Array<'ORGANIZADOR' | 'STAFF_PORTA'>;
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-ink text-cream/60">A carregar…</div>;
  }

  if (!user) {
    return <Navigate to="/backoffice/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/backoffice" replace />;
  }

  return <Outlet />;
}
