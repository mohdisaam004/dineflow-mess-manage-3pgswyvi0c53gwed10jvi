import { Hono } from "hono";
import type { Env } from './app-env';
import { MessSettingsEntity, MemberEntity, ExpenseEntity, AuditLogEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Member, MemberType, Expense, AuditLog, MessSettings } from "@shared/types";
import { calculateContribution, getCurrentPeriod, toLocalDateString } from "@shared/mess-utils";
import {
  AuthConfigError,
  hashPassword,
  requireAuthConfig,
  signToken,
  verifyPassword,
} from "./auth-utils";
import {
  authMiddleware,
  getAuth,
  requireAdmin,
  requireSuperAdmin,
  stripSensitiveSettings,
  type AuthContext,
} from "./auth-middleware";

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

function stripMemberPassword(member: Member): Omit<Member, 'password'> {
  const { password: _, ...rest } = member;
  return rest;
}

function startOfDayISO(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDayISO(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function resolveSuperAdminHash(env: Env): Promise<string> {
  const settings = await new MessSettingsEntity(env).getState();
  if (settings.superAdminPasswordHash) {
    return settings.superAdminPasswordHash;
  }
  return hashPassword(requireAuthConfig(env).superAdminPassword);
}

export function userRoutes(app: Hono<{ Bindings: Env; Variables: AuthContext }>) {
  app.use('/api/*', authMiddleware);

  // AUTH — public
  app.get('/api/auth/bootstrap', async (c) => {
    try {
      const settingsEntity = new MessSettingsEntity(c.env);
      const settings = await settingsEntity.getState();
      const members = await listAll((cursor) => MemberEntity.list(c.env, cursor));
      const publicMembers = members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        type: m.type,
      }));
      const safeSettings = stripSensitiveSettings(settings);
      return ok(c, {
        settings: safeSettings,
        members: publicMembers,
        requiresMemberPin: !!settings.memberAccessPinHash,
      });
    } catch (err) {
      if (err instanceof AuthConfigError) {
        return c.json({ success: false, error: err.message }, 503);
      }
      throw err;
    }
  });

  app.post('/api/auth/login', async (c) => {
    try {
      const { jwtSecret } = requireAuthConfig(c.env);
      const body = await c.req.json<{
        role: 'super_admin' | 'admin' | 'member';
        password?: string;
        memberId?: string;
        pin?: string;
      }>();
      const { role, password, memberId, pin } = body;

      if (role === 'super_admin') {
        if (!password) return bad(c, 'Password is required');
        const currentHash = await resolveSuperAdminHash(c.env);
        if (!(await verifyPassword(password, currentHash))) {
          return bad(c, 'Invalid credentials');
        }
        const token = await signToken(
          { sub: 'super_admin', role: 'super_admin', name: 'Super Admin' },
          jwtSecret
        );
        return ok(c, { role: 'super_admin', member: null, token });
      }

      if (role === 'admin' && memberId) {
        if (!password) return bad(c, 'Password is required');
        const memberEntity = new MemberEntity(c.env, memberId);
        if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
        const member = await memberEntity.getState();
        if (member.role !== 'admin') return bad(c, 'Member is not an admin');
        if (!member.password || !(await verifyPassword(password, member.password))) {
          return bad(c, 'Invalid credentials');
        }
        const token = await signToken(
          { sub: member.id, role: 'admin', name: member.name, memberId: member.id },
          jwtSecret
        );
        return ok(c, { role: 'admin', member: stripMemberPassword(member), token });
      }

      if (role === 'member' && memberId) {
        const settings = await new MessSettingsEntity(c.env).getState();
        if (settings.memberAccessPinHash) {
          if (!pin) return bad(c, 'PIN is required');
          if (!(await verifyPassword(pin, settings.memberAccessPinHash))) {
            return bad(c, 'Invalid PIN');
          }
        }
        const memberEntity = new MemberEntity(c.env, memberId);
        if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
        const member = await memberEntity.getState();
        if (member.role !== 'member') return bad(c, 'Use admin login for admin members');
        const token = await signToken(
          { sub: member.id, role: 'member', name: member.name, memberId: member.id },
          jwtSecret
        );
        return ok(c, { role: 'member', member: stripMemberPassword(member), token });
      }

      return bad(c, 'Invalid login request');
    } catch (err) {
      if (err instanceof AuthConfigError) {
        return c.json({ success: false, error: err.message }, 503);
      }
      throw err;
    }
  });

  app.post('/api/auth/super-admin/change-password', requireSuperAdmin, async (c) => {
    const { oldPassword, newPassword } = await c.req.json<{ oldPassword?: string; newPassword?: string }>();
    if (!oldPassword || !newPassword) {
      return bad(c, 'Old and new passwords are required');
    }
    const settingsEntity = new MessSettingsEntity(c.env);
    const settings = await settingsEntity.getState();
    const currentHash = settings.superAdminPasswordHash || (await resolveSuperAdminHash(c.env));
    if (!(await verifyPassword(oldPassword, currentHash))) {
      return bad(c, 'Incorrect old password');
    }
    const newPasswordHash = await hashPassword(newPassword);
    await settingsEntity.patch({ superAdminPasswordHash: newPasswordHash });
    return ok(c, { success: true });
  });

  // MESS SETTINGS — admin only
  app.post('/api/mess/init', requireAdmin, async (c) => {
    const { standardContribution, reducedContribution, totalDays, resetData, cycleStartDate } =
      await c.req.json<{
        standardContribution: number;
        reducedContribution: number;
        totalDays: number;
        resetData?: boolean;
        cycleStartDate?: string;
      }>();

    if (
      typeof standardContribution !== 'number' ||
      typeof reducedContribution !== 'number' ||
      typeof totalDays !== 'number'
    ) {
      return bad(c, 'Invalid input data');
    }

    const settingsEntity = new MessSettingsEntity(c.env);
    const existing = await settingsEntity.getState();
    const today = toLocalDateString();
    const newCycleStart = cycleStartDate || today;
    const newPeriod = getCurrentPeriod(new Date(newCycleStart + 'T00:00:00'));

    const patch: Partial<MessSettings> = {
      standardContribution,
      reducedContribution,
      totalDays,
      initialized: true,
    };

    if (resetData) {
      const archivePeriod = existing.currentPeriod || getCurrentPeriod();
      const allExpenses = await listAll((cursor) => ExpenseEntity.list(c.env, cursor));
      const expensesToArchive = allExpenses.filter((e) => !e.period);
      for (const expense of expensesToArchive) {
        const expenseEntity = new ExpenseEntity(c.env, expense.id);
        await expenseEntity.patch({ period: archivePeriod });
      }

      patch.currentPeriod = newPeriod;
      patch.cycleStartDate = newCycleStart;

      await AuditLogEntity.create(c.env, {
        id: crypto.randomUUID(),
        event: 'mess_reset',
        userId: getAuth(c).sub,
        userName: getAuth(c).name,
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: {
          standardContribution,
          reducedContribution,
          totalDays,
          previousPeriod: archivePeriod,
          newPeriod,
          cycleStartDate: newCycleStart,
          archivedCount: expensesToArchive.length,
        },
      });

      const allMembers = await listAll((cursor) => MemberEntity.list(c.env, cursor));
      for (const member of allMembers) {
        const memberEntity = new MemberEntity(c.env, member.id);
        const memberDays = totalDays;
        const newContribution = calculateContribution(member.type, memberDays, {
          standardContribution,
          reducedContribution,
          totalDays,
        });
        await memberEntity.patch({ contribution: newContribution, days: memberDays });
      }
    } else if (!existing.currentPeriod) {
      patch.currentPeriod = newPeriod;
      patch.cycleStartDate = newCycleStart;
    }

    await settingsEntity.patch(patch);
    const state = await settingsEntity.getState();
    return ok(c, stripSensitiveSettings(state));
  });

  app.get('/api/mess/state', async (c) => {
    const auth = getAuth(c);
    const settingsEntity = new MessSettingsEntity(c.env);
    const state = await settingsEntity.getState();
    const members = await listAll((cursor) => MemberEntity.list(c.env, cursor));
    const membersWithoutPasswords = members.map(stripMemberPassword);
    const safeSettings = stripSensitiveSettings(state);

    if (auth.role === 'member') {
      return ok(c, {
        settings: safeSettings,
        members: membersWithoutPasswords,
        expenses: [],
        auditLogs: [],
      });
    }

    const expenses = await listAll((cursor) => ExpenseEntity.list(c.env, cursor));
    const auditLogs = await listAll((cursor) => AuditLogEntity.list(c.env, cursor));
    return ok(c, {
      settings: safeSettings,
      members: membersWithoutPasswords,
      expenses,
      auditLogs,
    });
  });

  app.put('/api/mess/member-pin', requireSuperAdmin, async (c) => {
    const { pin } = await c.req.json<{ pin?: string | null }>();
    const settingsEntity = new MessSettingsEntity(c.env);
    if (pin === null || pin === '') {
      await settingsEntity.patch({ memberAccessPinHash: undefined });
      return ok(c, { success: true, requiresMemberPin: false });
    }
    if (!pin) return bad(c, 'PIN is required');
    const memberAccessPinHash = await hashPassword(pin);
    await settingsEntity.patch({ memberAccessPinHash });
    return ok(c, { success: true, requiresMemberPin: true });
  });

  // MEMBERS
  app.get('/api/members', requireAdmin, async (c) => {
    const members = await listAll((cursor) => MemberEntity.list(c.env, cursor));
    return ok(c, members.map(stripMemberPassword));
  });

  app.post('/api/members', requireAdmin, async (c) => {
    const { name, type, days } = (await c.req.json()) as { name?: string; type?: MemberType; days?: number };
    if (!isStr(name) || !['standard', 'reduced'].includes(type!)) return bad(c, 'Name and type are required');
    const settings = await new MessSettingsEntity(c.env).getState();
    const memberDays = typeof days === 'number' && days >= 0 ? days : settings.totalDays;
    const contribution = calculateContribution(type!, memberDays, settings);
    const member: Member = {
      id: crypto.randomUUID(),
      name,
      type: type!,
      contribution,
      role: 'member',
      days: memberDays,
    };
    await MemberEntity.create(c.env, member);
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'member_created',
      userId: getAuth(c).sub,
      userName: getAuth(c).name,
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { memberId: member.id, name: member.name },
    });
    return ok(c, member);
  });

  app.put('/api/members/:id', requireAdmin, async (c) => {
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
      const newDays = typeof days === 'number' ? days : (oldMember.days ?? settings.totalDays);
      updatePayload.contribution = calculateContribution(newType, newDays, settings);
    }
    await memberEntity.patch(updatePayload);
    const newMember = await memberEntity.getState();
    await AuditLogEntity.create(c.env, {
      id: crypto.randomUUID(),
      event: 'member_updated',
      userId: getAuth(c).sub,
      userName: getAuth(c).name,
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { memberId: newMember.id, changes: updatePayload },
    });
    return ok(c, stripMemberPassword(newMember));
  });

  app.put('/api/members/:id/role', requireSuperAdmin, async (c) => {
    const id = c.req.param('id');
    const { role, password } = (await c.req.json()) as { role: 'admin' | 'member'; password?: string };
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
    return ok(c, stripMemberPassword(updatedMember));
  });

  app.put('/api/members/:id/password', requireSuperAdmin, async (c) => {
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

  app.delete('/api/members/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const memberEntity = new MemberEntity(c.env, id);
    if (!(await memberEntity.exists())) return notFound(c, 'Member not found');
    const member = await memberEntity.getState();
    const deleted = await MemberEntity.delete(c.env, id);
    if (deleted) {
      await AuditLogEntity.create(c.env, {
        id: crypto.randomUUID(),
        event: 'member_deleted',
        userId: getAuth(c).sub,
        userName: getAuth(c).name,
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: { memberId: member.id, name: member.name },
      });
    }
    return ok(c, { id, deleted });
  });

  // EXPENSES
  app.get('/api/expenses', async (c) => {
    const auth = getAuth(c);
    const { fromDate, toDate, period, memberId, addedById, minAmount, maxAmount } = c.req.query();
    let expenses = await listAll((cursor) => ExpenseEntity.list(c.env, cursor));

    if (auth.role === 'member') {
      expenses = expenses.filter((e) => e.memberId === auth.memberId);
    }

    if (fromDate) expenses = expenses.filter((e) => new Date(e.date) >= startOfDayISO(fromDate));
    if (toDate) expenses = expenses.filter((e) => new Date(e.date) <= endOfDayISO(toDate));
    if (period) {
      if (period === 'current') {
        expenses = expenses.filter((e) => !e.period);
      } else if (period !== 'all') {
        expenses = expenses.filter((e) => e.period === period);
      }
    }
    if (memberId) expenses = expenses.filter((e) => e.memberId === memberId);
    if (addedById) expenses = expenses.filter((e) => e.addedById === addedById);
    if (minAmount) expenses = expenses.filter((e) => e.amount >= parseFloat(minAmount));
    if (maxAmount) expenses = expenses.filter((e) => e.amount <= parseFloat(maxAmount));
    return ok(c, expenses);
  });

  app.post('/api/expenses', async (c) => {
    const auth = getAuth(c);
    const { memberId, amount, date, note, deviceInfo, addedById, addedByName, period } =
      (await c.req.json()) as Partial<Expense>;
    if (
      !isStr(memberId) ||
      typeof amount !== 'number' ||
      !isStr(date) ||
      !isStr(deviceInfo) ||
      !isStr(addedById) ||
      !isStr(addedByName)
    ) {
      return bad(c, 'All fields are required');
    }

    if (auth.role === 'member' && memberId !== auth.memberId) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      memberId,
      amount,
      date,
      note,
      deviceInfo,
      addedById,
      addedByName,
      period,
    };
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

  app.put('/api/expenses/:id', requireAdmin, async (c) => {
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
      userId: getAuth(c).sub,
      userName: getAuth(c).name,
      timestamp: new Date().toISOString(),
      deviceInfo: c.req.header('User-Agent') || 'Unknown',
      metadata: { expenseId: updatedExpense.id, memberName: member.name, changes: updatePayload },
    });
    return ok(c, updatedExpense);
  });

  app.delete('/api/expenses/:id', requireAdmin, async (c) => {
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
        userId: getAuth(c).sub,
        userName: getAuth(c).name,
        timestamp: new Date().toISOString(),
        deviceInfo: c.req.header('User-Agent') || 'Unknown',
        metadata: { expenseId: expense.id, amount: expense.amount, memberName: member.name },
      });
    }
    return ok(c, { id, deleted });
  });

  // AUDIT LOGS — super admin only
  app.post('/api/audit-logs', async (c) => {
    const auth = getAuth(c);
    const body = (await c.req.json()) as Partial<AuditLog>;
    if (!body.event || !body.deviceInfo) {
      return bad(c, 'Missing required fields for audit log');
    }
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: body.userId || auth.sub,
      userName: body.userName || auth.name,
      ...body,
    } as AuditLog;
    await AuditLogEntity.create(c.env, auditLog);
    return ok(c, auditLog);
  });

  app.delete('/api/audit-logs/all', requireSuperAdmin, async (c) => {
    const allLogs = await listAll((cursor) => AuditLogEntity.list(c.env, cursor));
    const idsToDelete = allLogs.map((log) => log.id);
    if (idsToDelete.length > 0) {
      await AuditLogEntity.deleteMany(c.env, idsToDelete);
    }
    return ok(c, { deletedCount: idsToDelete.length });
  });

  app.delete('/api/audit-logs', requireSuperAdmin, async (c) => {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    if (!startDate || !endDate) {
      return bad(c, 'startDate and endDate query parameters are required.');
    }
    const allLogs = await listAll((cursor) => AuditLogEntity.list(c.env, cursor));
    const start = startOfDayISO(startDate);
    const end = endOfDayISO(endDate);
    const logsToDelete = allLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });
    const idsToDelete = logsToDelete.map((log) => log.id);
    if (idsToDelete.length > 0) {
      await AuditLogEntity.deleteMany(c.env, idsToDelete);
    }
    return ok(c, { deletedCount: idsToDelete.length });
  });
}
