import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/hooks/use-auth-store';
import { api } from '@/lib/api-client';
import type { MessSettings, Member, Expense } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import MemberDashboard from '@/components/dashboard/MemberDashboard';
interface MessState {
  settings: MessSettings;
  members: Member[];
  expenses: Expense[];
}
export function DashboardPage() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);
  const member = useAuthStore((state) => state.member);
  const logout = useAuthStore((state) => state.logout);
  const { data: messState, isLoading, error } = useQuery<MessState>({
    queryKey: ['messState'],
    queryFn: () => api('/api/mess/state'),
    enabled: !!role,
  });
  useEffect(() => {
    if (!role) {
      navigate('/');
    }
  }, [role, navigate]);
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const currentUser = role === 'admin' ? { name: 'Admin' } : member;
  const renderContent = () => {
    if (isLoading) {
      return <DashboardSkeleton />;
    }
    if (error) {
      return <div className="p-8 text-center text-red-500">Error loading dashboard data: {(error as Error).message}</div>;
    }
    if (!messState) {
      return <div className="p-8 text-center text-muted-foreground">No data available.</div>;
    }
    if (role === 'admin') {
      return <AdminDashboard messState={messState} />;
    }
    if (role === 'member' && member) {
      return <MemberDashboard messState={messState} currentUser={member} />;
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
function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md">
        <Skeleton className="h-10 w-1/4" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="mt-10 space-y-10">
        <Skeleton className="h-96 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  );
}