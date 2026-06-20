import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Download, Trash2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@shared/types';
interface AuditLogsTableProps {
  auditLogs: AuditLog[];
  onClearLogs?: (dateRange: DateRange) => void;
  onDownloadLogs?: (logs: AuditLog[]) => void;
}
const AuditLogsTable = ({ auditLogs, onClearLogs, onDownloadLogs }: AuditLogsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const formatEvent = (event: string) => {
    return event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const uniqueEvents = useMemo(() => {
    const events = new Set(auditLogs.map(log => log.event));
    return Array.from(events);
  }, [auditLogs]);
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        if (eventFilter !== 'all' && log.event !== eventFilter) return false;
        if (dateRange?.from && dateRange?.to) {
          const logDate = new Date(log.timestamp);
          if (logDate < startOfDay(dateRange.from) || logDate > endOfDay(dateRange.to)) {
            return false;
          }
        }
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          return (
            log.userName.toLowerCase().includes(lowerSearch) ||
            log.deviceInfo.toLowerCase().includes(lowerSearch) ||
            (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(lowerSearch))
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchTerm, eventFilter, dateRange]);
  const handleClearLogs = () => {
    if (dateRange?.from && dateRange?.to && onClearLogs) {
      onClearLogs(dateRange);
    }
    setConfirmOpen(false);
  };
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start">
        <Input
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {uniqueEvents.map(event => (
              <SelectItem key={event} value={event}>{formatEvent(event)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={() => onDownloadLogs?.(filteredLogs)} disabled={!onDownloadLogs || filteredLogs.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={!onClearLogs || !dateRange?.from || !dateRange?.to}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear
          </Button>
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="secondary">{formatEvent(log.event)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{log.userName}</TableCell>
                  <TableCell className="whitespace-nowrap">{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{JSON.stringify(log.metadata) || log.deviceInfo}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No audit logs found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all audit logs within the selected date range:
              <span className="font-semibold"> {dateRange?.from && format(dateRange.from, "PPP")} to {dateRange?.to && format(dateRange.to, "PPP")}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearLogs} className="bg-destructive hover:bg-destructive/90">
              Yes, Clear Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default AuditLogsTable;