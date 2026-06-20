import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Member, Expense, AuditLog } from '@shared/types';
import { DateRange } from 'react-day-picker';
interface MemberWithBalance extends Member {
  totalExpenses: number;
  balance: number;
}
type AuditLogMutation = (log: Partial<AuditLog>) => void;
const createFileName = (base: string, filtersApplied: boolean) => {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const suffix = filtersApplied ? '_filtered' : '';
  return `${base}_${dateStr}${suffix}.xlsx`;
};
export const exportAdminReport = (
  members: MemberWithBalance[],
  expenses: Expense[],
  createAuditLog: AuditLogMutation,
  filters?: any
) => {
  const wb = XLSX.utils.book_new();
  const filtersApplied = filters && (filters.search || filters.dateRange || filters.period !== 'all' || filters.memberId !== 'all' || filters.addedById !== 'all' || filters.minAmount || filters.maxAmount);
  // Members Sheet
  const membersData = members.map(m => ({
    Name: m.name,
    Type: m.type,
    Contribution: m.contribution,
    'Total Expenses': m.totalExpenses,
    'Remaining Balance': m.balance,
  }));
  const membersWs = XLSX.utils.json_to_sheet(membersData);
  XLSX.utils.book_append_sheet(wb, membersWs, 'Members Summary');
  // Expenses Sheet
  const memberMap = new Map(members.map(m => [m.id, m.name]));
  const expensesData = expenses.map(e => ({
    'Paid By': memberMap.get(e.memberId) || 'Unknown',
    'Added By': e.addedByName,
    Date: format(new Date(e.date), 'yyyy-MM-dd'),
    Period: e.period || 'Current',
    Note: e.note || '',
    Amount: e.amount,
    'Device Info': e.deviceInfo,
  }));
  const expensesWs = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, expensesWs, 'Filtered Expenses');
  // Download
  const fileName = createFileName('Baraha_Bad_Boys_Mess_Admin_Report', !!filtersApplied);
  XLSX.writeFile(wb, fileName);
  createAuditLog({ event: 'report_download', metadata: { filters } });
};
export const exportMemberReport = (
  member: MemberWithBalance,
  expenses: Expense[],
  createAuditLog: AuditLogMutation,
  filters?: any
) => {
  const wb = XLSX.utils.book_new();
  const filtersApplied = filters && (filters.search || filters.dateRange || filters.period !== 'all' || filters.minAmount || filters.maxAmount);
  // Summary Sheet
  const summaryData = [{
    Name: member.name,
    Type: member.type,
    Contribution: member.contribution,
    'Total Expenses': member.totalExpenses,
    'Remaining Balance': member.balance,
  }];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'My Summary');
  // Expenses Sheet
  const expensesData = expenses.map(e => ({
    Date: format(new Date(e.date), 'yyyy-MM-dd'),
    Period: e.period || 'Current',
    Amount: e.amount,
    Note: e.note || '',
  }));
  const expensesWs = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, expensesWs, 'My Expenses');
  // Download
  const fileName = createFileName(`Baraha_Bad_Boys_Mess_${member.name}_Report`, !!filtersApplied);
  XLSX.writeFile(wb, fileName);
  createAuditLog({ event: 'report_download', metadata: { filters } });
};
export const exportAuditLogs = (logs: AuditLog[]) => {
  const wb = XLSX.utils.book_new();
  const formatEvent = (event: string) => {
    return event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const logsData = logs.map(log => ({
    Event: formatEvent(log.event),
    User: log.userName,
    Timestamp: format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    Details: JSON.stringify(log.metadata) || log.deviceInfo,
  }));
  const logsWs = XLSX.utils.json_to_sheet(logsData);
  XLSX.utils.book_append_sheet(wb, logsWs, 'Audit Logs');
  const fileName = `Baraha_Bad_Boys_Mess_Audit_Logs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};