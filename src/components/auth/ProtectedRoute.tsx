import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/hooks/use-auth-store';
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: 'admin' | 'member';
}
export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const role = useAuthStore((state) => state.role);
  if (!role) {
    // User not logged in, redirect to login page
    return <Navigate to="/" replace />;
  }
  if (role !== allowedRole) {
    // User has the wrong role, redirect them to their correct dashboard
    const redirectTo = role === 'admin' ? '/admin/dashboard' : '/member/dashboard';
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
};