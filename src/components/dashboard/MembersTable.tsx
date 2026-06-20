import { MoreHorizontal, Pencil, Trash2, ShieldCheck, UserCheck, Share2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Member } from '@shared/types';
interface MemberWithBalance extends Member {
  totalExpenses: number;
  balance: number;
}
interface MembersTableProps {
  members: MemberWithBalance[];
  onEdit: (member: MemberWithBalance) => void;
  onDelete: (id: string) => void;
  isSuperAdmin?: boolean;
  onToggleAdmin?: (args: { memberId: string; newRole: 'admin' | 'member' }) => void;
  onPromote?: (member: Member) => void;
  onResetPassword?: (member: Member) => void;
}
const MembersTable = ({ members, onEdit, onDelete, isSuperAdmin, onToggleAdmin, onPromote, onResetPassword }: MembersTableProps) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  const handleShareLogin = (memberId: string) => {
    const url = `${window.location.origin}/login/${memberId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success('Login link copied to clipboard!');
      })
      .catch(err => {
        toast.error('Failed to copy link.');
        console.error('Could not copy text: ', err);
      });
  };
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Days</TableHead>
            <TableHead className="text-right">Contribution</TableHead>
            <TableHead className="text-right">Expenses</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length > 0 ? (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium whitespace-nowrap">{member.name}</TableCell>
                <TableCell>
                  <Badge variant={member.type === 'standard' ? 'default' : 'secondary'}>
                    {member.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={member.role === 'admin' ? 'outline' : 'secondary'} className={member.role === 'admin' ? 'border-green-600 text-green-700' : ''}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>{member.days ?? 'N/A'}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatCurrency(member.contribution)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatCurrency(member.totalExpenses)}</TableCell>
                <TableCell className={`text-right font-semibold whitespace-nowrap ${member.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(member.balance)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(member)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareLogin(member.id)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Share Login</span>
                      </DropdownMenuItem>
                      {isSuperAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          {member.role === 'member' ? (
                            <DropdownMenuItem onClick={() => onPromote?.(member)}>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              <span>Promote to Admin</span>
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => onToggleAdmin?.({ memberId: member.id, newRole: 'member' })}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                <span>Demote to Member</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onResetPassword?.(member)}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                <span>Reset Password</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(member.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
export default MembersTable;