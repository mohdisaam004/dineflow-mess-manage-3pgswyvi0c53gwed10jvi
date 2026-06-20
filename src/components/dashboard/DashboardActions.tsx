import { useState } from 'react';
import { PlusCircle, Settings, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SetupMessForm from '@/components/forms/SetupMessForm';
import MemberForm from '@/components/forms/MemberForm';
import ExpenseForm from '@/components/forms/ExpenseForm';
import type { MessSettings, Member } from '@shared/types';
interface DashboardActionsProps {
  settings?: MessSettings;
  members: Member[];
}
const DashboardActions = ({ settings, members }: DashboardActionsProps) => {
  const [isSetupOpen, setSetupOpen] = useState(false);
  const [isMemberOpen, setMemberOpen] = useState(false);
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white rounded-lg shadow-md w-full">
      <div className="text-center md:text-left">
        <h2 className="text-xl font-semibold text-gray-800">Admin Controls</h2>
        <p className="text-sm text-muted-foreground">Manage your mess settings and entries.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Dialog open={isSetupOpen} onOpenChange={setSetupOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              {settings?.initialized ? 'Update Settings' : 'Initialize Mess'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{settings?.initialized ? 'Update Mess Settings' : 'Initialize Mess for the Month'}</DialogTitle>
            </DialogHeader>
            <SetupMessForm settings={settings} onSuccess={() => setSetupOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={isMemberOpen} onOpenChange={setMemberOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <MemberForm onSuccess={() => setMemberOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={isExpenseOpen} onOpenChange={setExpenseOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm members={members} onSuccess={() => setExpenseOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
export default DashboardActions;