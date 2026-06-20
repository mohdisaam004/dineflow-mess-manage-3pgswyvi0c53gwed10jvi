import { useState, useMemo, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { MoreHorizontal, Trash2, Pencil, Search, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useDebounce } from 'react-use';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Expense, Member } from '@shared/types';
interface ExpensesTableProps {
  expenses: Expense[];
  members: Member[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
  onFiltersChange?: (filters: any) => void;
}
const ExpensesTable = ({ expenses, members, onEdit, onDelete, onFiltersChange }: ExpensesTableProps) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    memberId: 'all',
    addedById: 'all',
    period: 'all',
    dateRange: undefined as DateRange | undefined,
    minAmount: '',
    maxAmount: '',
  });
  useDebounce(() => setDebouncedSearch(search), 300, [search]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const uniqueAddedBy = useMemo(() => {
    const addedBy = new Map<string, string>();
    expenses.forEach(e => {
      if (!addedBy.has(e.addedById)) {
        addedBy.set(e.addedById, e.addedByName);
      }
    });
    return Array.from(addedBy.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);
  const uniquePeriods = useMemo(() => Array.from(new Set(expenses.map(e => e.period).filter(Boolean))), [expenses]);
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Search filter
      if (debouncedSearch) {
        const searchTerm = debouncedSearch.toLowerCase();
        const memberName = memberMap.get(expense.memberId)?.toLowerCase() || '';
        const addedByName = expense.addedByName.toLowerCase();
        const note = expense.note?.toLowerCase() || '';
        const amount = expense.amount.toString();
        if (!memberName.includes(searchTerm) && !addedByName.includes(searchTerm) && !note.includes(searchTerm) && !amount.includes(searchTerm)) {
          return false;
        }
      }
      // Column filters
      if (filters.memberId !== 'all' && expense.memberId !== filters.memberId) return false;
      if (filters.addedById !== 'all' && expense.addedById !== filters.addedById) return false;
      if (filters.period !== 'all') {
        if (filters.period === 'current' && expense.period) return false;
        if (filters.period !== 'current' && expense.period !== filters.period) return false;
      }
      if (filters.dateRange?.from && new Date(expense.date) < startOfDay(filters.dateRange.from)) return false;
      if (filters.dateRange?.to && new Date(expense.date) > endOfDay(filters.dateRange.to)) return false;
      if (filters.minAmount && expense.amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && expense.amount > parseFloat(filters.maxAmount)) return false;
      return true;
    });
  }, [expenses, debouncedSearch, filters, memberMap]);
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch, filters, onFiltersChange]);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  const hasActions = !!onEdit || !!onDelete;
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Select value={filters.memberId} onValueChange={v => setFilters(f => ({ ...f, memberId: v }))}>
          <SelectTrigger><SelectValue placeholder="Filter by Paid By" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.addedById} onValueChange={v => setFilters(f => ({ ...f, addedById: v }))}>
          <SelectTrigger><SelectValue placeholder="Filter by Added By" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {uniqueAddedBy.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.dateRange && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (filters.dateRange.to ? `${format(filters.dateRange.from, "LLL dd, y")} - ${format(filters.dateRange.to, "LLL dd, y")}` : format(filters.dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={filters.dateRange} onSelect={v => setFilters(f => ({ ...f, dateRange: v }))} />
          </PopoverContent>
        </Popover>
        <div className="flex gap-2">
          <Input type="number" placeholder="Min Amount" value={filters.minAmount} onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))} />
          <Input type="number" placeholder="Max Amount" value={filters.maxAmount} onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))} />
        </div>
        <Select value={filters.period} onValueChange={v => setFilters(f => ({ ...f, period: v }))}>
          <SelectTrigger><SelectValue placeholder="Filter by Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            <SelectItem value="current">Current Period</SelectItem>
            {uniquePeriods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paid By</TableHead>
              <TableHead>Added By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {hasActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium whitespace-nowrap">{memberMap.get(expense.memberId) || 'Unknown'}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{expense.addedByName}</TableCell>
                  <TableCell className="whitespace-nowrap">{format(new Date(expense.date), 'PP')}</TableCell>
                  <TableCell className="whitespace-nowrap">{expense.period || 'Current'}</TableCell>
                  <TableCell className="text-muted-foreground">{expense.note || '-'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(expense.amount)}</TableCell>
                  {hasActions && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && <DropdownMenuItem onClick={() => onEdit(expense)}><Pencil className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>}
                          {onDelete && <DropdownMenuItem onClick={() => onDelete(expense.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={hasActions ? 7 : 6} className="h-24 text-center">No expenses found for the selected filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
export default ExpensesTable;