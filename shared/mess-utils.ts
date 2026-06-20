import type { MemberType, MessSettings } from './types';

/** Format a Date as YYYY-MM-DD in local timezone. */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Current billing period as YYYY-MM in local timezone. */
export function getCurrentPeriod(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Human-readable label for a period string. */
export function formatPeriodLabel(period: string): string {
  if (period === 'current') return 'Current';
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Days remaining in the current mess cycle (inclusive of today). */
export function getRemainingDays(
  cycleStartDate: string | undefined,
  totalDays: number,
  today: Date = new Date()
): number {
  if (!cycleStartDate || totalDays <= 0) return totalDays;

  const start = new Date(cycleStartDate + 'T00:00:00');
  const elapsed = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const remaining = totalDays - elapsed;
  return Math.max(0, remaining);
}

/** Pro-rated contribution for a member based on type and days. */
export function calculateContribution(
  type: MemberType,
  days: number,
  settings: Pick<MessSettings, 'standardContribution' | 'reducedContribution' | 'totalDays'>
): number {
  const base =
    type === 'standard'
      ? settings.standardContribution
      : settings.reducedContribution;
  if (settings.totalDays <= 0) return base;
  return (base / settings.totalDays) * days;
}

/** Adjusted daily spend rate for the remaining cycle days. */
export function calculateAdjustedDailyRate(
  balance: number,
  cycleStartDate: string | undefined,
  totalDays: number,
  today: Date = new Date()
): number {
  const remaining = getRemainingDays(cycleStartDate, totalDays, today);
  return remaining > 0 ? balance / remaining : 0;
}
