import { Hono } from "hono";
import type { Env } from './core-utils';
import { MessSettingsEntity, MemberEntity, ExpenseEntity, AuditLogEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Member, MemberType, Expense, AuditLog } from "@shared/types";
import { hashPassword } from "./auth-utils";
// Helper to fetch all items from a paginated list
async function listAll<T>(
  fetchPage: (cursor?: string | null) => Promise<{ items: T[]; next: string | null }>
): Promise<T[]> {
  const allItems: T[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    allItems.push(...page.items);
    cursor = page.next;
  } while (cursor);
  return allItems;
}
// Fallback super admin password for initial setup
const SUPER_ADMIN_PASSWORD_HASH = 'b2e909512216d362dececcda68d4ed4b77a7413e1a80e8154b84ddac2fd533dd'; // Muhammed97@#
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // AUTH
  app.post('/api/auth/login', async (c) => {
    const { role, password, memberId } = await c.req.json<{ role: 'super_admin' | 'admin', password?: string, memberId?: string }>();
    if (!password) return bad(c, 'Password is required');
    const passwordHash = await hashPassword(password);
    if (role === 'super_admin') {
      const settings = await new MessSettingsEntity(c.env).getState();
      const currentHash = settings.superAdminPasswordHash || SUPER_ADMIN_PASSWORD_HASH;
      if (passwordHash === currentHash) {
        return ok(c, { role: 'admin', member: null });
      }
      return bad(c, 'Invalid credentials');
    }
    if (role === 'admin' && memberId) {
      const memberEntity = new MemberEntity(c.env, memberId);
      if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
      const member = await memberEntity.getState();
      if (member.role !== 'admin') return bad(c, 'Member is not an admin');
      if (member.password === passwordHash) {
        const { password, ...memberWithoutPassword } = member;
        return ok(c, { role: 'admin', member: memberWithoutPassword });
      }
      return bad(c, 'Invalid credentials');
    }
    return bad(c, 'Invalid login request');
  });
  app.post('/api/auth/super-admin/change-password', async (c) => {
    const { oldPassword, newPassword } = await c.req.json<{ oldPassword?: string, newPassword?: string }>();
    if (!oldPassword || !newPassword) {
      return bad(c, 'Old and new passwords are required');
    }
    const settingsEntity = new MessSettingsEntity(c.env);
    const settings = await settingsEntity.getState();
    const currentHash = settings.superAdminPasswordHash || SUPER_ADMIN_PASSWORD_HASH;
    const oldPasswordHash = await hashPassword(oldPassword);
    if (oldPasswordHash !== currentHash) {
      return bad(c, 'Incorrect old password');
    }
    const newPasswordHash = await hashPassword(newPassword);
    await settingsEntity.patch({ superAdminPasswordHash: newPasswordHash });
    return ok(c, { success: true });
  });
  // MESS SETTINGS
  app.post('/api/mess/init', async (c) => {
    const { standardContribution, reducedContribution, totalDays, resetData } = await c.req.json();
    if (typeof standardContribution !== 'number' || typeof reducedContribution !== 'number' || typeof totalDays !== 'number') {
      return bad(c, 'Invalid input data');
    }
    const settings = new MessSettingsEntity(c.env);
    await settings.patch({ standardContribution, reducedContribution, totalDays, initialized: true });
    if (resetData) {
      const allExpenses = await listAll(cursor => ExpenseEntity.list(c.env, cursor));
      const expensesToArchive = allExpenses.filter(e => !e.period);
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
      for (const expense of expensesToArchive) {
        const expenseEntity = new ExpenseEntity(c.env, expense.id);
        await expenseEntity.patch({ period: currentPeriod });
      }
      await AuditLogEntity.create(c.env, {
        id: crypto.randomUUID(),
        event: 'mess_reset',
        userId: 'admin',
        userName: 'Admin',
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: { standardContribution, reducedContribution, totalDays, previousPeriod: currentPeriod, archivedCount: expensesToArchive.length },
      });
      const allMembers = await listAll(cursor => MemberEntity.list(c.env, cursor));
      for (const member of allMembers) {
        const memberEntity = new MemberEntity(c.env, member.id);
        const memberDays = member.days ?? totalDays;
        const baseContribution = member.type === 'standard' ? standardContribution : reducedContribution;
        const newContribution = totalDays > 0 ? (baseContribution / totalDays) * memberDays : baseContribution;
        await memberEntity.patch({ contribution: newContribution });
      }
    }
    return ok(c, await settings.getState());
  });
  app.get('/api/mess/state', async (c) => {
    const settings = new MessSettingsEntity(c.env);
    const state = await settings.getState();
    const members = await listAll(cursor => MemberEntity.list(c.env, cursor));
    const expenses = await listAll(cursor => ExpenseEntity.list(c.env, cursor));
    const auditLogs = await listAll(cursor => AuditLogEntity.list(c.env, cursor));
    const membersWithoutPasswords = members.map(m => {
      const { password, ...rest } = m;
      return rest;
    });
    return ok(c, { settings: state, members: membersWithoutPasswords, expenses: expenses, auditLogs: auditLogs });
  });
  // MEMBERS
  app.get('/api/members', async (c) => {
    const members = await listAll(cursor => MemberEntity.list(c.env, cursor));
    const membersWithoutPasswords = members.map(m => {
      const { password, ...rest } = m;
      return rest;
    });
    return ok(c, membersWithoutPasswords);
  });
  app.post('/api/members', async (c) => {
    const { name, type, days } = (await c.req.json()) as { name?: string; type?: MemberType; days?: number };
    if (!isStr(name) || !['standard', 'reduced'].includes(type!)) return bad(c, 'Name and type are required');
    const settings = await new MessSettingsEntity(c.env).getState();
    const memberDays = typeof days === 'number' && days >= 0 ? days : settings.totalDays;
    const baseContribution = type === 'standard' ? settings.standardContribution : settings.reducedContribution;
    const contribution = settings.totalDays > 0
      ? (baseContribution / settings.totalDays) * memberDays
      : baseContribution;
    const member: Member = { id: crypto.randomUUID(), name, type: type!, contribution, role: 'member', days: memberDays };
    await MemberEntity.create(c.env, member);
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'member_created',
      userId: 'admin',
      userName: 'Admin',
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { memberId: member.id, name: member.name },
    });
    return ok(c, member);
  });
  app.put('/api/members/:id', async (c) => {
    const id = c.req.param('id');
    const { name, type, contribution, days } = (await c.req.json()) as Partial<Member>;
    if (!isStr(name) && !isStr(type) && typeof contribution !== 'number' && typeof days !== 'number') {
      return bad(c, 'At least one field is required');
    }
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const oldMember = await memberEntity.getState();
    const updatePayload: Partial<Member> = {};
    if (name) updatePayload.name = name;
    if (type) updatePayload.type = type;
    if (typeof days === 'number') updatePayload.days = days;
    if (typeof contribution === 'number') {
      updatePayload.contribution = contribution;
    } else if (type || typeof days === 'number') {
      const settings = await new MessSettingsEntity(c.env).getState();
      const newType = type || oldMember.type;
      const newDays = typeof days === 'number' ? days : oldMember.days;
      const baseContribution = newType === 'standard' ? settings.standardContribution : settings.reducedContribution;
      if (settings.totalDays > 0 && typeof newDays === 'number') {
        updatePayload.contribution = (baseContribution / settings.totalDays) * newDays;
      } else {
        updatePayload.contribution = baseContribution;
      }
    }
    await memberEntity.patch(updatePayload);
    const newMember = await memberEntity.getState();
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'member_updated',
      userId: 'admin',
      userName: 'Admin',
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { memberId: newMember.id, changes: updatePayload },
    });
    const { password, ...memberWithoutPassword } = newMember;
    return ok(c, memberWithoutPassword);
  });
  app.put('/api/members/:id/role', async (c) => {
    const id = c.req.param('id');
    const { role, password } = (await c.req.json()) as { role: 'admin' | 'member', password?: string };
    if (!['admin', 'member'].includes(role)) {
      return bad(c, 'Invalid role specified');
    }
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const updatePayload: Partial<Member> = { role };
    if (role === 'admin') {
      if (!password) return bad(c, 'Password is required to promote to admin');
      updatePayload.password = await hashPassword(password);
    } else {
      updatePayload.password = undefined;
    }
    await memberEntity.patch(updatePayload);
    const updatedMember = await memberEntity.getState();
    const { password: _, ...memberWithoutPassword } = updatedMember;
    return ok(c, memberWithoutPassword);
  });
  app.put('/api/members/:id/password', async (c) => {
    const id = c.req.param('id');
    const { password } = await c.req.json<{ password?: string }>();
    if (!password) {
      return bad(c, 'New password is required');
    }
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const member = await memberEntity.getState();
    if (member.role !== 'admin') {
      return bad(c, 'Can only reset passwords for admin members.');
    }
    const newPasswordHash = await hashPassword(password);
    await memberEntity.patch({ password: newPasswordHash });
    return ok(c, { success: true });
  });
  app.delete('/api/members/:id', async (c) => {
    const id = c.req.param('id');
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const member = await memberEntity.getState();
    const deleted = await MemberEntity.delete(c.env, id);
    if (deleted) {
      await AuditLogEntity.create(c.env, {
        id: crypto.randomUUID(),
        event: 'member_deleted',
        userId: 'admin',
        userName: 'Admin',
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: { memberId: member.id, name: member.name },
      });
    }
    return ok(c, { id, deleted });
  });
  // EXPENSES
  app.get('/api/expenses', async (c) => {
    const { fromDate, toDate, period, memberId, addedById, minAmount, maxAmount } = c.req.query();
    let expenses = await listAll(cursor => ExpenseEntity.list(c.env, cursor));
    if (fromDate) expenses = expenses.filter(e => new Date(e.date) >= new Date(fromDate));
    if (toDate) expenses = expenses.filter(e => new Date(e.date) <= new Date(toDate));
    if (period) {
      if (period === 'current') {
        expenses = expenses.filter(e => !e.period);
      } else if (period !== 'all') {
        expenses = expenses.filter(e => e.period === period);
      }
    }
    if (memberId) expenses = expenses.filter(e => e.memberId === memberId);
    if (addedById) expenses = expenses.filter(e => e.addedById === addedById);
    if (minAmount) expenses = expenses.filter(e => e.amount >= parseFloat(minAmount));
    if (maxAmount) expenses = expenses.filter(e => e.amount <= parseFloat(maxAmount));
    return ok(c, expenses);
  });
  app.post('/api/expenses', async (c) => {
    const { memberId, amount, date, note, deviceInfo, addedById, addedByName, period } = (await c.req.json()) as Partial<Expense>;
    if (!isStr(memberId) || typeof amount !== 'number' || !isStr(date) || !isStr(deviceInfo) || !isStr(addedById) || !isStr(addedByName)) {
      return bad(c, 'All fields are required');
    }
    const expense: Expense = { id: crypto.randomUUID(), memberId, amount, date, note, deviceInfo, addedById, addedByName, period };
    await ExpenseEntity.create(c.env, expense);
    const member = await new MemberEntity(c.env, memberId).getState();
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'expense_created',
      userId: addedById,
      userName: addedByName,
      timestamp: new Date().toISOString(),
      deviceInfo,
      metadata: {
        expenseId: expense.id,
        amount: expense.amount,
        paidById: memberId,
        paidByName: member.name,
      },
    });
    return ok(c, expense);
  });
  app.put('/api/expenses/:id', async (c) => {
    const id = c.req.param('id');
    const { memberId, amount, date, note, period } = (await c.req.json()) as Partial<Expense>;
    const expenseEntity = new ExpenseEntity(c.env, id);
    if (!(await expenseEntity.exists())) return notFound(c, 'Expense not found');
    const updatePayload: Partial<Expense> = {};
    if (isStr(memberId)) updatePayload.memberId = memberId;
    if (typeof amount === 'number') updatePayload.amount = amount;
    if (isStr(date)) updatePayload.date = date;
    if (note !== undefined) updatePayload.note = note;
    if (period !== undefined) updatePayload.period = period;
    await expenseEntity.patch(updatePayload);
    const updatedExpense = await expenseEntity.getState();
    const member = await new MemberEntity(c.env, updatedExpense.memberId).getState();
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'expense_updated',
      userId: 'admin',
      userName: 'Admin',
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { expenseId: updatedExpense.id, memberName: member.name, changes: updatePayload },
    });
    return ok(c, updatedExpense);
  });
  app.delete('/api/expenses/:id', async (c) => {
    const id = c.req.param('id');
    const expenseEntity = new ExpenseEntity(c.env, id);
    if (!(await expenseEntity.exists())) return notFound(c, 'Expense not found');
    const expense = await expenseEntity.getState();
    const deleted = await ExpenseEntity.delete(c.env, id);
    if (deleted) {
      const member = await new MemberEntity(c.env, expense.memberId).getState();
      await AuditLogEntity.create(c.env, {
        id: crypto.randomUUID(),
        event: 'expense_deleted',
        userId: 'admin',
        userName: 'Admin',
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: { expenseId: expense.id, amount: expense.amount, memberName: member.name },
      });
    }
    return ok(c, { id, deleted });
  });
  // AUDIT LOGS
  app.post('/api/audit-logs', async (c) => {
    const body = (await c.req.json()) as Partial<AuditLog>;
    if (!body.event || !body.userId || !body.userName || !body.deviceInfo) {
      return bad(c, 'Missing required fields for audit log');
    }
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...body,
    } as AuditLog;
    await AuditLogEntity.create(c.env, auditLog);
    return ok(c, auditLog);
  });
  app.delete('/api/audit-logs', async (c) => {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    if (!startDate || !endDate) {
      return bad(c, 'startDate and endDate query parameters are required.');
    }
    const allLogs = await listAll(cursor => AuditLogEntity.list(c.env, cursor));
    const start = new Date(startDate);
    const end = new Date(endDate);
    const logsToDelete = allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });
    const idsToDelete = logsToDelete.map(log => log.id);
    if (idsToDelete.length > 0) {
      await AuditLogEntity.deleteMany(c.env, idsToDelete);
    }
    return ok(c, { deletedCount: idsToDelete.length });
  });
}