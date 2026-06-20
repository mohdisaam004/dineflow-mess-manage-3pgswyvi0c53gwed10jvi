import { useMemo, useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Users, ShoppingCart, Download, TrendingUp, KeyRound, History, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';
import { api } from '@/lib/api-client';
import { getDeviceInfo } from '@/lib/utils';
import { useAuthStore } from '@/hooks/use-auth-store';
import type { MessSettings, Member, Expense, AuditLog } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/StatCard';
import MembersTable from '@/components/dashboard/MembersTable';
import ExpensesTable from '@/components/dashboard/ExpensesTable';
import AuditLogsTable from '@/components/dashboard/AuditLogsTable';
import DashboardActions from '@/components/dashboard/DashboardActions';
import MemberForm from '@/components/forms/MemberForm';
import ExpenseForm from '@/components/forms/ExpenseForm';
import { exportAdminReport, exportAuditLogs } from '@/lib/reporting';
import SetAdminPasswordDialog from './SetAdminPasswordDialog';
import ResetAdminPasswordDialog from './ResetAdminPasswordDialog';
import SuperAdminChangePasswordDialog from './SuperAdminChangePasswordDialog';
interface MessState {
  settings: MessSettings;
  members: Member[];
  auditLogs: AuditLog[];
}
interface AdminDashboardProps {
  messState: MessState;
  adminUser: Member | null;
}
const AdminDashboard = ({ messState, adminUser }: AdminDashboardProps) => {
  const queryClient = useQueryClient();
  const { role, member } = useAuthStore();
  const isSuperAdmin = role === 'admin' && !member;
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [promotingMember, setPromotingMember] = useState<Member | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<Member | null>(null);
  const [isChangePasswordOpen, setChangePasswordOpen] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState<any>({ period: 'current' });
  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses'], // Fetch all expenses once
    queryFn: () => api(`/api/expenses`),
    placeholderData: [],
  });
  const { mutate: createAuditLog } = useMutation({
    mutationFn: (log: Partial<AuditLog>) => api('/api/audit-logs', { method: 'POST', body: JSON.stringify(log) }),
    onError: (err) => console.error("Failed to create audit log:", err),
  });
  const { mutate: deleteMember } = useMutation({
    mutationFn: (id: string) => api(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Member deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['messState'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const { mutate: deleteExpense } = useMutation({
    mutationFn: (id: string) => api(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Expense deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const { mutate: toggleAdminRole } = useMutation({
    mutationFn: ({ memberId, newRole, password }: { memberId: string; newRole: 'admin' | 'member'; password?: string }) =>
      api(`/api/members/${memberId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole, password }) }),
    onSuccess: () => {
      toast.success("Member's role updated successfully");
      queryClient.invalidateQueries({ queryKey: ['messState'] });
      setPromotingMember(null);
    },
    onError: (err) => toast.error(`Failed to update role: ${(err as Error).message}`),
  });
  const { mutate: resetPassword } = useMutation({
    mutationFn: ({ memberId, password }: { memberId: string; password?: string }) =>
      api(`/api/members/${memberId}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
    onSuccess: () => {
      toast.success("Admin password has been reset.");
      queryClient.invalidateQueries({ queryKey: ['messState'] });
      setResettingPasswordFor(null);
    },
    onError: (err) => toast.error(`Failed to reset password: ${(err as Error).message}`),
  });
  const { mutate: clearAuditLogs } = useMutation({
    mutationFn: (dateRange: DateRange) => {
      const params = new URLSearchParams({
        startDate: dateRange.from!.toISOString(),
        endDate: dateRange.to!.toISOString(),
      });
      return api(`/api/audit-logs?${params.toString()}`, { method: 'DELETE' });
    },
    onSuccess: (data: any) => {
      toast.success(`${data.deletedCount} audit logs cleared successfully.`);
      queryClient.invalidateQueries({ queryKey: ['messState'] });
    },
    onError: (err) => toast.error(`Failed to clear audit logs: ${(err as Error).message}`),
  });
  const memberMap = useMemo(() => new Map(messState.members.map((m) => [m.id, m.name])), [messState.members]);
  const filteredExpensesForReport = useMemo(() => {
    return expenses.filter(expense => {
      if (expenseFilters.search) {
        const searchTerm = expenseFilters.search.toLowerCase();
        const memberName = memberMap.get(expense.memberId)?.toLowerCase() || '';
        const addedByName = expense.addedByName.toLowerCase();
        const note = expense.note?.toLowerCase() || '';
        const amount = expense.amount.toString();
        if (!memberName.includes(searchTerm) && !addedByName.includes(searchTerm) && !note.includes(searchTerm) && !amount.includes(searchTerm)) {
          return false;
        }
      }
      if (expenseFilters.memberId && expenseFilters.memberId !== 'all' && expense.memberId !== expenseFilters.memberId) return false;
      if (expenseFilters.addedById && expenseFilters.addedById !== 'all' && expense.addedById !== expenseFilters.addedById) return false;
      if (expenseFilters.period && expenseFilters.period !== 'all') {
        if (expenseFilters.period === 'current' && expense.period) return false;
        if (expenseFilters.period !== 'current' && expense.period !== expenseFilters.period) return false;
      }
      if (expenseFilters.dateRange?.from && new Date(expense.date) < startOfDay(expenseFilters.dateRange.from)) return false;
      if (expenseFilters.dateRange?.to && new Date(expense.date) > endOfDay(expenseFilters.dateRange.to)) return false;
      if (expenseFilters.minAmount && expense.amount < parseFloat(expenseFilters.minAmount)) return false;
      if (expenseFilters.maxAmount && expense.amount > parseFloat(expenseFilters.maxAmount)) return false;
      return true;
    });
  }, [expenses, expenseFilters, memberMap]);
  const { totalContribution, totalSpent, balance, membersWithExpenses, adjustedDailyRate } = useMemo(() => {
    if (!messState) return { totalContribution: 0, totalSpent: 0, balance: 0, membersWithExpenses: [], adjustedDailyRate: 0 };
    const currentExpenses = expenses.filter(e => !e.period);
    const totalContribution = messState.members.reduce((sum, m) => sum + m.contribution, 0);
    const totalSpent = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalContribution - totalSpent;
    const membersWithExpenses = messState.members.map(m => {
      const memberExpenses = currentExpenses.filter(e => e.memberId === m.id);
      const totalExpenses = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
      const memberBalance = m.contribution - totalExpenses;
      return { ...m, totalExpenses, balance: memberBalance };
    });
    const remainingDays = messState.settings.totalDays - (new Date().getDate() - 1);
    const adjustedDailyRate = remainingDays > 0 ? balance / remainingDays : 0;
    return { totalContribution, totalSpent, balance, membersWithExpenses, adjustedDailyRate };
  }, [messState, expenses]);
  const handleDownloadReport = () => {
    try {
      const userName = member?.name || 'Super Admin';
      exportAdminReport(membersWithExpenses, filteredExpensesForReport, (log) => {
        createAuditLog({
          ...log,
          userId: member?.id || 'super_admin',
          userName: userName,
          deviceInfo: getDeviceInfo(),
        });
      }, expenseFilters);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      toast.error("Failed to generate report.");
      console.error(error);
    }
  };
  const handleDownloadLogs = (logs: AuditLog[]) => {
    try {
      exportAuditLogs(logs);
      toast.success("Audit logs downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download audit logs.");
      console.error(error);
    }
  };
  const isFiltersActive = expenseFilters.period !== 'current' || expenseFilters.dateRange || expenseFilters.search || expenseFilters.memberId !== 'all' || expenseFilters.addedById !== 'all' || expenseFilters.minAmount || expenseFilters.maxAmount;
  return (
    <div className="py-8 md:py-10 lg:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <DashboardActions settings={messState?.settings} members={messState?.members || []} />
        <div className="flex flex-col items-stretch sm:items-end space-y-2 w-full md:w-auto">
          <Button onClick={handleDownloadReport} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          {isSuperAdmin && (
            <Button onClick={() => setChangePasswordOpen(true)} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105">
              <KeyRound className="mr-2 h-4 w-4" />
              Change My Password
            </Button>
          )}
        </div>
      </div>
      <motion.div
        className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mt-8"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <StatCard title="Total Contribution" value={totalContribution} icon={DollarSign} formatAsCurrency />
        <StatCard title="Total Spent (Current)" value={totalSpent} icon={ShoppingCart} formatAsCurrency />
        <StatCard title="Balance (Current)" value={balance} icon={DollarSign} formatAsCurrency isPositive={balance >= 0} />
        <StatCard title="Adj. Daily Rate" value={adjustedDailyRate} icon={TrendingUp} formatAsCurrency isPositive={adjustedDailyRate >= 0} />
        <StatCard title="Total Members" value={messState?.members.length || 0} icon={Users} />
      </motion.div>
      <div className="mt-10 space-y-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Members Overview</h2>
              <MembersTable
                members={membersWithExpenses}
                onEdit={(member) => setEditingMember(member)}
                onDelete={deleteMember}
                isSuperAdmin={isSuperAdmin}
                onToggleAdmin={toggleAdminRole}
                onPromote={(member) => setPromotingMember(member)}
                onResetPassword={(member) => setResettingPasswordFor(member)}
              />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Expenses History</h2>
                {isFiltersActive && <Badge variant="secondary" className="flex items-center gap-2">Filtered View <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setExpenseFilters({ period: 'current', memberId: 'all', addedById: 'all' })}><XCircle className="h-3 w-3" /></Button></Badge>}
              </div>
              <ExpensesTable
                expenses={expenses}
                members={messState?.members || []}
                onEdit={(expense) => setEditingExpense(expense)}
                onDelete={deleteExpense}
                onFiltersChange={setExpenseFilters}
              />
            </CardContent>
          </Card>
        </motion.div>
        {isSuperAdmin && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">Audit Logs</h2>
                <AuditLogsTable
                  auditLogs={messState?.auditLogs || []}
                  onClearLogs={clearAuditLogs}
                  onDownloadLogs={handleDownloadLogs}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      <Dialog open={!!editingMember} onOpenChange={(isOpen) => !isOpen && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          {editingMember && <MemberForm member={editingMember} onSuccess={() => setEditingMember(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingExpense} onOpenChange={(isOpen) => !isOpen && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
          {editingExpense && <ExpenseForm expense={editingExpense} members={messState.members} onSuccess={() => setEditingExpense(null)} />}
        </DialogContent>
      </Dialog>
      {promotingMember && <SetAdminPasswordDialog member={promotingMember} onClose={() => setPromotingMember(null)} onConfirm={(password) => toggleAdminRole({ memberId: promotingMember.id, newRole: 'admin', password })} />}
      {resettingPasswordFor && <ResetAdminPasswordDialog member={resettingPasswordFor} onClose={() => setResettingPasswordFor(null)} onConfirm={(password) => resetPassword({ memberId: resettingPasswordFor.id, password })} />}
      {isSuperAdmin && <SuperAdminChangePasswordDialog isOpen={isChangePasswordOpen} onClose={() => setChangePasswordOpen(false)} />}
    </div>
  );
};
export default AdminDashboard;