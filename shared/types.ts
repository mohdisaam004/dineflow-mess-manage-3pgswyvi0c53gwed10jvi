export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type MemberType = 'standard' | 'reduced';
export interface Member {
  id: string;
  name: string;
  type: MemberType;
  contribution: number;
  role: 'admin' | 'member';
  password?: string;
  days?: number;
}
export interface Expense {
  id:string;
  memberId: string;
  amount: number;
  date: string; // ISO string
  note?: string;
  deviceInfo: string;
  addedById: string;
  addedByName: string;
  period?: string; // e.g., '2024-10'
}
export interface MessSettings {
  id: 'global'; // Singleton
  standardContribution: number;
  reducedContribution: number;
  totalDays: number;
  initialized: boolean;
  superAdminPasswordHash?: string;
}
export type AuditLogEvent = 'login' | 'expense_created' | 'expense_updated' | 'expense_deleted' | 'member_created' | 'member_updated' | 'member_deleted' | 'report_download' | 'mess_reset';
export interface AuditLog {
  id: string;
  event: AuditLogEvent;
  userId: string; // Can be 'admin' or a member ID
  userName: string;
  timestamp: string; // ISO string
  deviceInfo: string;
  metadata?: Record<string, any>;
}