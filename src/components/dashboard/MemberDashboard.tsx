import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, Wallet, PlusCircle, Download, TrendingUp } from 'lucide-react';
import type { MessSettings, Member, Expense, AuditLog } from '@shared/types';
import { api } from '@/lib/api-client';
import { getDeviceInfo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StatCard from '@/components/dashboard/StatCard';
import ExpensesTable from '@/components/dashboard/ExpensesTable';
import ExpenseForm from '@/components/forms/ExpenseForm';
import { exportMemberReport } from '@/lib/reporting';
interface MessState {
  settings: MessSettings;
  members: Member[];
  auditLogs: AuditLog[];
}
interface MemberDashboardProps {
  messState: MessState;
  currentUser: Member;
}
const MemberDashboard = ({ messState, currentUser }: MemberDashboardProps) => {
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState<any>({ period: 'all' });
  const { data: allMyExpenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses', { memberId: currentUser.id }],
    queryFn: () => api(`/api/expenses?memberId=${currentUser.id}`),
    placeholderData: [],
  });
  const { mutate: createAuditLog } = useMutation({
    mutationFn: (log: Partial<AuditLog>) => api('/api/audit-logs', { method: 'POST', body: JSON.stringify(log) }),
    onError: (err) => console.error("Failed to create audit log:", err),
  });
  const { myCurrentExpenses, myTotalSpent, myBalance, adjustedDailyRate } = useMemo(() => {
    const myCurrentExpenses = allMyExpenses.filter(e => !e.period);
    const myTotalSpent = myCurrentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const myBalance = currentUser.contribution - myTotalSpent;
    const totalContribution = messState.members.reduce((sum, m) => sum + m.contribution, 0);
    const totalSpent = messState.members.reduce((sum, member) => {
        return sum + allMyExpenses.filter(e => e.memberId === member.id && !e.period).reduce((s, e) => s + e.amount, 0);
    }, 0);
    const balance = totalContribution - totalSpent;
    const remainingDays = messState.settings.totalDays - (new Date().getDate() - 1);
    const adjustedDailyRate = remainingDays > 0 ? balance / remainingDays : 0;
    return { myCurrentExpenses, myTotalSpent, myBalance, adjustedDailyRate };
  }, [allMyExpenses, currentUser, messState]);
  const handleDownloadReport = () => {
    try {
      const memberWithBalance = {
        ...currentUser,
        totalExpenses: myTotalSpent,
        balance: myBalance,
      };
      exportMemberReport(memberWithBalance, allMyExpenses, (log) => {
        createAuditLog({
          ...log,
          userId: currentUser.id,
          userName: currentUser.name,
          deviceInfo: getDeviceInfo(),
        });
      }, expenseFilters);
      toast.success("Your report has been downloaded!");
    } catch (error) {
      toast.error("Failed to generate your report.");
      console.error(error);
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white rounded-lg shadow-md">
                <div className="text-center md:text-left">
                <h2 className="text-xl font-semibold text-gray-800">My Dashboard</h2>
                <p className="text-sm text-muted-foreground">Here's your personal mess summary.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                <Dialog open={isExpenseOpen} onOpenChange={setExpenseOpen}>
                    <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Expense
                    </Button>
                    </DialogTrigger>
                    <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log a New Expense</DialogTitle>
                    </DialogHeader>
                    <ExpenseForm members={messState.members} onSuccess={() => setExpenseOpen(false)} />
                    </DialogContent>
                </Dialog>
                <Button onClick={handleDownloadReport} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download My Report
                </Button>
                </div>
            </div>
            <motion.div
                className="grid gap-6 grid-cols-2 lg:grid-cols-4 mt-8"
                initial="hidden"
                animate="visible"
                variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1 } }
                }}
            >
                <StatCard title="My Contribution" value={currentUser.contribution} icon={DollarSign} formatAsCurrency />
                <StatCard title="My Total Spent (Current)" value={myTotalSpent} icon={ShoppingCart} formatAsCurrency />
                <StatCard title="My Balance (Current)" value={myBalance} icon={Wallet} formatAsCurrency isPositive={myBalance >= 0} />
                <StatCard title="Adj. Daily Rate" value={adjustedDailyRate} icon={TrendingUp} formatAsCurrency isPositive={adjustedDailyRate >= 0} />
            </motion.div>
            <div className="mt-10">
                <Card className="shadow-lg">
                <CardContent className="p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">My Expense History</h2>
                    <ExpensesTable
                      expenses={allMyExpenses}
                      members={messState.members}
                      onFiltersChange={setExpenseFilters}
                    />
                </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
};
export default MemberDashboard;