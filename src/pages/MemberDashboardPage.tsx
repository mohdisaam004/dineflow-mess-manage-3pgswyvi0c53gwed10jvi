import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/hooks/use-auth-store';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MemberDashboard from '@/components/dashboard/MemberDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import type { MessSettings, Member, Expense, AuditLog } from '@shared/types';
interface MessState {
  settings: MessSettings;
  members: Member[];
  expenses: Expense[];
  auditLogs: AuditLog[];
}
export function MemberDashboardPage() {
  const navigate = useNavigate();
  const { member: currentUser, logout } = useAuthStore();
  const { data: messState, isLoading, error } = useQuery<MessState>({
    queryKey: ['messState'],
    queryFn: () => api('/api/mess/state'),
  });
  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };
  if (!currentUser) {
    // This should be caught by ProtectedRoute, but as a fallback
    navigate('/');
    return null;
  }
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12 space-y-8">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12 text-center">
            <p className="text-red-500">Failed to load dashboard data: {error.message}</p>
          </div>
        </div>
      );
    }
    if (messState) {
      return (
        <MemberDashboard messState={messState} currentUser={currentUser} />
      );
    }
    return null;
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors />
      <DashboardHeader user={currentUser} onLogout={handleLogout} />
      {renderContent()}
    </div>
  );
}