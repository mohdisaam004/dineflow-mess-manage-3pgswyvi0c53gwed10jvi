import { UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Member } from '@shared/types';
interface DashboardHeaderProps {
  user: Member | { name: string } | null;
  onLogout: () => void;
}
const DashboardHeader = ({ user, onLogout }: DashboardHeaderProps) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-8 w-8 text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Baraha Bad Boys Mess Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-gray-800">{user?.name || 'User'}</span>
          </span>
          <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
        </div>
      </div>
    </header>
  );
};
export default DashboardHeader;