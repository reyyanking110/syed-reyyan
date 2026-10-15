import "server-only";
import { endOfMonth, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  invoices,
  payments,
  projects,
  tasks,
  type Currency,
  type InvoiceStatus,
  type PaymentMethod,
  type ProjectStatus,
  type User,
} from "@/db/schema";
import { convertCurrency } from "@/lib/money";
import type { AnalyticsData } from "@/lib/types";
import { percentChange, roundMoney, toNumber } from "@/lib/utils";
import { getMonthlySeries } from "./dashboard";
import { refreshOverdueInvoices } from "./invoices";

export type AnalyticsRange = "3m" | "6m" | "12m" | "ytd";

const RANGE_LABEL: Record<AnalyticsRange, string> = {
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  ytd: "Year to date",
};

function resolveRange(range: AnalyticsRange) {
  const now = new Date();
  const end = endOfMonth(now);
  let months: number;
  if (range === "ytd") months = now.getMonth() + 1;
  else months = Number.parseInt(range, 10);
  const start = startOfMonth(subMonths(now, months - 1));
  return { start, end, months, label: RANGE_LABEL[range] };
}

export async function getAnalyticsData(user: User, rangeKey: AnalyticsRange = "12m"): Promise<AnalyticsData> {
  await refreshOverdueInvoices(user.id);

  const { start, end, months, label } = resolveRange(rangeKey);
  const from = format(start, "yyyy-MM-dd");
  const to = format(end, "yyyy-MM-dd");
  const previousStart = format(startOfMonth(subMonths(start, months)), "yyyy-MM-dd");
  const previousEnd = format(endOfMonth(subMonths(end, months)), "yyyy-MM-dd");
  const rate = toNumber(user.usdToPkrRate, 278.5);
  const toBase = (amount: string | number | null | undefined, currency: Currency) =>
    convertCurrency(toNumber(amount), currency, user.baseCurrency, rate);

  const weekStart = startOfWeek(subWeeks(new Date(), 7), { weekStartsOn: 1 });

  const [
    revenueSeries,
    paymentTotals,
    previousPayments,
    invoiceTotals,
    byClient,
    byCurrency,
    byStatus,
    byProjectStatus,
    tasksCompletedRows,
    tasksCreatedRows,
    byMethod,
    daysToPayRows,
    topProjects,
    counts,
  ] = await Promise.all([
    getMonthlySeries(user, months),
    db
      .select({ currency: payments.currency, amount: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.userId, user.id), gte(payments.paidAt, from), lte(payments.paidAt, to)))
      .groupBy(payments.currency),
    db
      .select({ currency: payments.currency, amount: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.userId, user.id), gte(payments.paidAt, previousStart), lte(payments.paidAt, previousEnd)))
      .groupBy(payments.currency),
    db
      .select({
        currency: invoices.currency,
        invoiced: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} not in ('draft','cancelled')), 0)`,
        outstanding: sql<string>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}) filter (where ${invoices.status} in ('sent','partially_paid','overdue')), 0)`,
        overdue: sql<string>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}) filter (where ${invoices.status} = 'overdue'), 0)`,
        count: sql<number>`count(*) filter (where ${invoices.status} not in ('draft','cancelled'))::int`,
        paidCount: sql<number>`count(*) filter (where ${invoices.status} = 'paid')::int`,
      })
      .from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.issueDate, from), lte(invoices.issueDate, to)))
      .groupBy(invoices.currency),
    db
      .select({
        clientId: clients.id,
        name: clients.name,
        company: clients.company,
        color: clients.color,
        currency: payments.currency,
        amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(clients, eq(clients.id, payments.clientId))
      .where(and(eq(payments.userId, user.id), gte(payments.paidAt, from), lte(payments.paidAt, to)))
      .groupBy(clients.id, clients.name, clients.company, clients.color, payments.currency),
    db
      .select({ currency: payments.currency, amount: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.userId, user.id), gte(payments.paidAt, from), lte(payments.paidAt, to)))
      .groupBy(payments.currency),
    db
      .select({
        status: invoices.status,
        currency: invoices.currency,
        count: sql<number>`count(*)::int`,
        amount: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.issueDate, from), lte(invoices.issueDate, to)))
      .groupBy(invoices.status, invoices.currency),
    db
      .select({ status: projects.status, count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.userId, user.id))
      .groupBy(projects.status),
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${tasks.completedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.status, "done"), gte(tasks.completedAt, weekStart)))
      .groupBy(sql`1`),
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${tasks.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), gte(tasks.createdAt, weekStart)))
      .groupBy(sql`1`),
    db
      .select({
        method: payments.method,
        currency: payments.currency,
        amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(and(eq(payments.userId, user.id), gte(payments.paidAt, from), lte(payments.paidAt, to)))
      .groupBy(payments.method, payments.currency),
    db
      .select({ days: sql<number>`avg(${invoices.paidAt}::date - ${invoices.issueDate})::float` })
      .from(invoices)
      .where(and(eq(invoices.userId, user.id), eq(invoices.status, "paid"), gte(invoices.issueDate, from), lte(invoices.issueDate, to))),
    db
      .select({
        projectId: projects.id,
        name: projects.name,
        color: projects.color,
        budget: projects.budget,
        currency: projects.currency,
        client: clients.company,
        clientName: clients.name,
        invoiced: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} not in ('draft','cancelled')), 0)`,
        paid: sql<string>`coalesce(sum(${invoices.amountPaid}) filter (where ${invoices.status} <> 'cancelled'), 0)`,
      })
      .from(projects)
      .leftJoin(invoices, eq(invoices.projectId, projects.id))
      .leftJoin(clients, eq(clients.id, projects.clientId))
      .where(eq(projects.userId, user.id))
      .groupBy(projects.id, projects.name, projects.color, projects.budget, projects.currency, clients.company, clients.name)
      .orderBy(desc(sql`coalesce(sum(${invoices.amountPaid}), 0)`))
      .limit(6),
    Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(eq(tasks.userId, user.id), eq(tasks.status, "done"), gte(tasks.completedAt, start), lte(tasks.completedAt, end)))
        .then((rows) => rows[0]?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(and(eq(projects.userId, user.id), eq(projects.status, "completed"), gte(projects.completedAt, start), lte(projects.completedAt, end)))
        .then((rows) => rows[0]?.count ?? 0),
    ]),
  ]);

  const revenue = roundMoney(paymentTotals.reduce((sum, row) => sum + toBase(row.amount, row.currency), 0));
  const previousRevenue = roundMoney(previousPayments.reduce((sum, row) => sum + toBase(row.amount, row.currency), 0));
  const invoiced = roundMoney(invoiceTotals.reduce((sum, row) => sum + toBase(row.invoiced, row.currency), 0));
  const outstanding = roundMoney(invoiceTotals.reduce((sum, row) => sum + toBase(row.outstanding, row.currency), 0));
  const overdue = roundMoney(invoiceTotals.reduce((sum, row) => sum + toBase(row.overdue, row.currency), 0));
  const invoicesCount = invoiceTotals.reduce((sum, row) => sum + row.count, 0);
  const paidInvoicesCount = invoiceTotals.reduce((sum, row) => sum + row.paidCount, 0);

  const clientMap = new Map<string, { clientId: string; name: string; company: string | null; color: string; revenue: number }>();
  for (const row of byClient) {
    const entry = clientMap.get(row.clientId) ?? { clientId: row.clientId, name: row.name, company: row.company, color: row.color, revenue: 0 };
    entry.revenue = roundMoney(entry.revenue + toBase(row.amount, row.currency));
    clientMap.set(row.clientId, entry);
  }
  const revenueByClient = Array.from(clientMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((entry) => ({ ...entry, share: revenue ? Math.round((entry.revenue / revenue) * 100) : 0 }));

  const revenueByCurrency = byCurrency
    .map((row) => {
      const amountBase = toBase(row.amount, row.currency);
      return { currency: row.currency, amount: roundMoney(toNumber(row.amount)), amountBase: roundMoney(amountBase), share: revenue ? Math.round((amountBase / revenue) * 100) : 0 };
    })
    .sort((a, b) => b.amountBase - a.amountBase);

  const statusMap = new Map<InvoiceStatus, { status: InvoiceStatus; count: number; amount: number }>();
  for (const row of byStatus) {
    const entry = statusMap.get(row.status) ?? { status: row.status, count: 0, amount: 0 };
    entry.count += row.count;
    entry.amount = roundMoney(entry.amount + toBase(row.amount, row.currency));
    statusMap.set(row.status, entry);
  }

  const projectStatusOrder: ProjectStatus[] = ["planning", "in_progress", "on_hold", "completed", "cancelled"];
  const projectStatus = projectStatusOrder.map((status) => ({
    status,
    count: byProjectStatus.find((row) => row.status === status)?.count ?? 0,
  }));

  const taskThroughput: AnalyticsData["taskThroughput"] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const week = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const key = format(week, "yyyy-MM-dd");
    taskThroughput.push({
      week: key,
      label: format(week, "MMM d"),
      completed: tasksCompletedRows.find((row) => row.week === key)?.count ?? 0,
      created: tasksCreatedRows.find((row) => row.week === key)?.count ?? 0,
    });
  }

  const methodMap = new Map<PaymentMethod, { method: PaymentMethod; amount: number; count: number }>();
  for (const row of byMethod) {
    const entry = methodMap.get(row.method) ?? { method: row.method, amount: 0, count: 0 };
    entry.amount = roundMoney(entry.amount + toBase(row.amount, row.currency));
    entry.count += row.count;
    methodMap.set(row.method, entry);
  }

  const averageDays = daysToPayRows[0]?.days;

  return {
    baseCurrency: user.baseCurrency,
    range: { from, to, label, months },
    totals: {
      revenue,
      previousRevenue,
      revenueChange: percentChange(revenue, previousRevenue),
      invoiced,
      outstanding,
      overdue,
      averageInvoice: invoicesCount ? roundMoney(invoiced / invoicesCount) : 0,
      averageDaysToPay: averageDays === null || averageDays === undefined ? null : Math.round(averageDays),
      collectionRate: invoiced ? Math.min(100, Math.round((revenue / invoiced) * 100)) : 0,
      invoicesCount,
      paidInvoicesCount,
      tasksCompleted: counts[0],
      projectsCompleted: counts[1],
    },
    revenueSeries,
    revenueByClient,
    revenueByCurrency,
    invoiceStatus: Array.from(statusMap.values()),
    projectStatus,
    taskThroughput,
    paymentMethods: Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount),
    topProjects: topProjects.map((row) => ({
      projectId: row.projectId,
      name: row.name,
      color: row.color,
      client: row.client ?? row.clientName ?? null,
      invoiced: roundMoney(toNumber(row.invoiced)),
      paid: roundMoney(toNumber(row.paid)),
      budget: row.budget ? toNumber(row.budget) : null,
      currency: row.currency,
    })),
  };
}
