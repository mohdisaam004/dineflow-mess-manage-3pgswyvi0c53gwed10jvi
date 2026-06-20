import { Navigate } from 'react-router-dom';
import { useAuthStore, isAdminRole } from '@/hooks/use-auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: 'admin' | 'member';
}

export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const role = useAuthStore((state) => state.role);

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole === 'admin' && !isAdminRole(role)) {
    return <Navigate to="/member/dashboard" replace />;
  }

  if (allowedRole === 'member' && role !== 'member') {
    const redirectTo = isAdminRole(role) ? '/admin/dashboard' : '/';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
