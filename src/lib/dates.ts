import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from "date-fns";

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // Date-only strings from Postgres ("2026-10-15") must be parsed as local dates.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateInput(value: string | Date | null | undefined) {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function todayInput() {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(value: string | Date | null | undefined, pattern = "MMM d, yyyy") {
  const date = toDate(value);
  return date ? format(date, pattern) : "—";
}

export function formatDateTime(value: string | Date | null | undefined) {
  const date = toDate(value);
  return date ? format(date, "MMM d, yyyy · h:mm a") : "—";
}

export function formatRelative(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/** Human friendly due-date label: "Today", "Tomorrow", "3 days overdue", "in 5 days". */
export function dueLabel(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return { label: "No due date", tone: "muted" as const };
  if (isToday(date)) return { label: "Due today", tone: "warning" as const };
  if (isTomorrow(date)) return { label: "Due tomorrow", tone: "warning" as const };
  if (isYesterday(date)) return { label: "1 day overdue", tone: "danger" as const };
  const diff = differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
  if (diff < 0) return { label: `${Math.abs(diff)} days overdue`, tone: "danger" as const };
  if (diff <= 7) return { label: `Due in ${diff} days`, tone: "default" as const };
  return { label: format(date, "MMM d"), tone: "muted" as const };
}

export function daysBetween(a: string | Date | null | undefined, b: string | Date | null | undefined) {
  const start = toDate(a);
  const end = toDate(b);
  if (!start || !end) return 0;
  return differenceInCalendarDays(startOfDay(end), startOfDay(start));
}

export function isPastDue(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return false;
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date())) < 0;
}

/** Adds `days` to a yyyy-MM-dd (or Date) value and returns a yyyy-MM-dd string for date inputs. */
export function addDaysInput(value: string | Date | null | undefined, days: number) {
  const base = toDate(value) ?? new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return toDateInput(next);
}
