import "server-only";
import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, clients, invoices, payments, projects, tasks, type Currency, type User } from "@/db/schema";
import { convertCurrency } from "@/lib/money";
import type { DashboardData, MonthlyPoint } from "@/lib/types";
import { percentChange, roundMoney, toNumber } from "@/lib/utils";
import { refreshOverdueInvoices } from "./invoices";
import { listInvoices } from "./invoices";
import { listProjects } from "./projects";
import { listTasks } from "./tasks";

export async function getMonthlySeries(user: User, months: number, endDate = new Date()): Promise<MonthlyPoint[]> {
  const start = startOfMonth(subMonths(endDate, months - 1));
  const end = endOfMonth(endDate);
  const startKey = format(start, "yyyy-MM-dd");
  const endKey = format(end, "yyyy-MM-dd");
  const rate = toNumber(user.usdToPkrRate, 278.5);

  const [paymentRows, invoiceRows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${payments.paidAt}), 'YYYY-MM')`,
        currency: payments.currency,
        amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.userId, user.id), gte(payments.paidAt, startKey), lte(payments.paidAt, endKey)))
      .groupBy(sql`1`, payments.currency),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${invoices.issueDate}), 'YYYY-MM')`,
        currency: invoices.currency,
        amount: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, user.id),
          gte(invoices.issueDate, startKey),
          lte(invoices.issueDate, endKey),
          inArray(invoices.status, ["sent", "partially_paid", "paid", "overdue"]),
        ),
      )
      .groupBy(sql`1`, invoices.currency),
  ]);

  const series: MonthlyPoint[] = [];
  for (let i = 0; i < months; i += 1) {
    const date = subMonths(end, months - 1 - i);
    series.push({ month: format(date, "yyyy-MM"), label: format(date, months > 6 ? "MMM" : "MMM yy"), revenue: 0, invoiced: 0 });
  }
  const index = new Map(series.map((point) => [point.month, point]));
  for (const row of paymentRows) {
    const point = index.get(row.month);
    if (point) point.revenue = roundMoney(point.revenue + convertCurrency(toNumber(row.amount), row.currency as Currency, user.baseCurrency, rate));
  }
  for (const row of invoiceRows) {
    const point = index.get(row.month);
    if (point) point.invoiced = roundMoney(point.invoiced + convertCurrency(toNumber(row.amount), row.currency as Currency, user.baseCurrency, rate));
  }
  return series;
}

export async function getDashboardData(user: User): Promise<DashboardData> {
  await refreshOverdueInvoices(user.id);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const weekAhead = format(addDays(now, 7), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const rate = toNumber(user.usdToPkrRate, 278.5);
  const toBase = (amount: string | number | null, currency: Currency) =>
    convertCurrency(toNumber(amount), currency, user.baseCurrency, rate);

  const [revenueRows, outstandingRows, projectRow, taskRow, clientRow, revenueSeries, recentInvoices, upcomingTasks, activeProjects, recentActivity] =
    await Promise.all([
      db
        .select({
          currency: payments.currency,
          thisMonth: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.paidAt} >= ${monthStart} and ${payments.paidAt} <= ${monthEnd}), 0)`,
          lastMonth: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.paidAt} >= ${lastMonthStart} and ${payments.paidAt} <= ${lastMonthEnd}), 0)`,
        })
        .from(payments)
        .where(eq(payments.userId, user.id))
        .groupBy(payments.currency),
      db
        .select({
          currency: invoices.currency,
          outstanding: sql<string>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}) filter (where ${invoices.status} in ('sent','partially_paid','overdue')), 0)`,
          overdue: sql<string>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}) filter (where ${invoices.status} = 'overdue'), 0)`,
          overdueCount: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')::int`,
        })
        .from(invoices)
        .where(eq(invoices.userId, user.id))
        .groupBy(invoices.currency),
      db
        .select({
          active: sql<number>`count(*) filter (where ${projects.status} in ('planning','in_progress'))::int`,
          completedThisMonth: sql<number>`count(*) filter (where ${projects.status} = 'completed' and ${projects.completedAt} >= ${monthStart}::date)::int`,
        })
        .from(projects)
        .where(eq(projects.userId, user.id))
        .then((rows) => rows[0]),
      db
        .select({
          dueWeek: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} >= ${today} and ${tasks.dueDate} <= ${weekAhead})::int`,
          overdue: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} < ${today})::int`,
        })
        .from(tasks)
        .where(eq(tasks.userId, user.id))
        .then((rows) => rows[0]),
      db
        .select({
          active: sql<number>`count(*) filter (where ${clients.status} = 'active')::int`,
          newThisMonth: sql<number>`count(*) filter (where ${clients.createdAt} >= ${monthStart}::date)::int`,
        })
        .from(clients)
        .where(eq(clients.userId, user.id))
        .then((rows) => rows[0]),
      getMonthlySeries(user, 12),
      listInvoices(user, { sort: "recent" }).then((rows) => rows.slice(0, 6)),
      listTasks(user.id, { status: "open", sort: "due" }).then((rows) => rows.filter((task) => task.dueDate).slice(0, 7)),
      listProjects(user, { status: "active", sort: "due" }).then((rows) => rows.slice(0, 5)),
      db.select().from(activities).where(eq(activities.userId, user.id)).orderBy(desc(activities.createdAt)).limit(8),
    ]);

  let revenueThisMonth = 0;
  let revenueLastMonth = 0;
  for (const row of revenueRows) {
    revenueThisMonth += toBase(row.thisMonth, row.currency);
    revenueLastMonth += toBase(row.lastMonth, row.currency);
  }
  let outstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  for (const row of outstandingRows) {
    outstanding += toBase(row.outstanding, row.currency);
    overdueAmount += toBase(row.overdue, row.currency);
    overdueCount += row.overdueCount;
  }

  return {
    baseCurrency: user.baseCurrency,
    kpis: {
      revenueThisMonth: roundMoney(revenueThisMonth),
      revenueLastMonth: roundMoney(revenueLastMonth),
      revenueChange: percentChange(revenueThisMonth, revenueLastMonth),
      outstanding: roundMoney(outstanding),
      overdueCount,
      overdueAmount: roundMoney(overdueAmount),
      activeProjects: projectRow?.active ?? 0,
      completedProjectsThisMonth: projectRow?.completedThisMonth ?? 0,
      tasksDueThisWeek: taskRow?.dueWeek ?? 0,
      tasksOverdue: taskRow?.overdue ?? 0,
      activeClients: clientRow?.active ?? 0,
      newClientsThisMonth: clientRow?.newThisMonth ?? 0,
    },
    revenueSeries,
    recentInvoices,
    upcomingTasks,
    activeProjects,
    recentActivity,
  };
}

/** Counts of demo-flagged records, used by Settings → Data. */
export async function getDemoCounts(userId: string) {
  const [row] = await db
    .select({
      clients: sql<number>`(select count(*) from ${clients} where ${clients.userId} = ${userId} and ${clients.isDemo} = true)::int`,
      projects: sql<number>`(select count(*) from ${projects} where ${projects.userId} = ${userId} and ${projects.isDemo} = true)::int`,
      invoices: sql<number>`(select count(*) from ${invoices} where ${invoices.userId} = ${userId} and ${invoices.isDemo} = true)::int`,
      tasks: sql<number>`(select count(*) from ${tasks} where ${tasks.userId} = ${userId} and ${tasks.isDemo} = true)::int`,
    })
    .from(sql`(select 1) as one`);
  const counts = { clients: row?.clients ?? 0, projects: row?.projects ?? 0, invoices: row?.invoices ?? 0, tasks: row?.tasks ?? 0 };
  return { ...counts, total: counts.clients + counts.projects + counts.invoices + counts.tasks };
}
