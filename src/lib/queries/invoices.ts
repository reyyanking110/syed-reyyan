import "server-only";
import { format } from "date-fns";
import { and, asc, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  invoices,
  payments,
  projects,
  type Currency,
  type Invoice,
  type InvoiceStatus,
  type User,
} from "@/db/schema";
import { notify } from "@/lib/activity";
import { convertCurrency, formatMoney } from "@/lib/money";
import type { InvoiceDetail, InvoiceListItem, PaymentListItem } from "@/lib/types";
import { roundMoney, toNumber } from "@/lib/utils";

export type InvoiceFilters = {
  q?: string;
  status?: InvoiceStatus | "all" | "open";
  clientId?: string;
  currency?: Currency | "all";
  sort?: "recent" | "due" | "amount";
};

function withComputed<T extends Invoice>(invoice: T) {
  const totalNumber = toNumber(invoice.total);
  const amountPaidNumber = toNumber(invoice.amountPaid);
  return { ...invoice, totalNumber, amountPaidNumber, balanceDue: roundMoney(Math.max(0, totalNumber - amountPaidNumber)) };
}

/**
 * Marks sent / partially paid invoices whose due date has passed as overdue and raises a
 * notification once per invoice. Called when invoice-heavy pages load so state stays fresh
 * without a background job.
 */
export async function refreshOverdueInvoices(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const stale = await db
    .select({ id: invoices.id, number: invoices.number, total: invoices.total, amountPaid: invoices.amountPaid, currency: invoices.currency, clientId: invoices.clientId, overdueNotifiedAt: invoices.overdueNotifiedAt })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), inArray(invoices.status, ["sent", "partially_paid"]), lt(invoices.dueDate, today)));
  if (stale.length === 0) return 0;

  const ids = stale.map((row) => row.id);
  await db.update(invoices).set({ status: "overdue", overdueNotifiedAt: new Date() }).where(inArray(invoices.id, ids));

  const clientRows = await db
    .select({ id: clients.id, company: clients.company, name: clients.name })
    .from(clients)
    .where(inArray(clients.id, Array.from(new Set(stale.map((row) => row.clientId)))));
  const clientMap = new Map(clientRows.map((row) => [row.id, row.company ?? row.name]));

  for (const row of stale) {
    if (row.overdueNotifiedAt) continue;
    const balance = toNumber(row.total) - toNumber(row.amountPaid);
    await notify(db, userId, {
      type: "invoice",
      title: `Invoice ${row.number} is overdue`,
      body: `${clientMap.get(row.clientId) ?? "Client"} · ${formatMoney(balance, row.currency)} outstanding.`,
      href: `/invoices/${row.id}`,
    });
  }
  return stale.length;
}

export async function listInvoices(user: User, filters: InvoiceFilters = {}): Promise<InvoiceListItem[]> {
  const conditions: SQL[] = [eq(invoices.userId, user.id)];
  if (filters.status === "open") conditions.push(inArray(invoices.status, ["sent", "partially_paid", "overdue"]));
  else if (filters.status && filters.status !== "all") conditions.push(eq(invoices.status, filters.status));
  if (filters.clientId) conditions.push(eq(invoices.clientId, filters.clientId));
  if (filters.currency && filters.currency !== "all") conditions.push(eq(invoices.currency, filters.currency));
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(invoices.number, term), ilike(clients.name, term), ilike(clients.company, term), ilike(projects.name, term))!);
  }

  const orderBy =
    filters.sort === "due"
      ? [asc(invoices.dueDate), desc(invoices.sequence)]
      : filters.sort === "amount"
        ? [desc(invoices.total)]
        : [desc(invoices.issueDate), desc(invoices.sequence)];

  const rows = await db
    .select({
      invoice: invoices,
      client: { id: clients.id, name: clients.name, company: clients.company, color: clients.color },
      project: { id: projects.id, name: projects.name },
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(...conditions))
    .orderBy(...orderBy);

  return rows.map(({ invoice, client, project }) => ({
    ...withComputed(invoice),
    client,
    project: project?.id ? project : null,
  }));
}

export async function getInvoiceSummary(user: User) {
  const rows = await db
    .select({
      currency: invoices.currency,
      status: invoices.status,
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      paid: sql<string>`coalesce(sum(${invoices.amountPaid}), 0)`,
    })
    .from(invoices)
    .where(eq(invoices.userId, user.id))
    .groupBy(invoices.currency, invoices.status);

  const rate = toNumber(user.usdToPkrRate, 278.5);
  const summary = { outstanding: 0, overdue: 0, overdueCount: 0, paidTotal: 0, draftCount: 0, openCount: 0 };
  for (const row of rows) {
    const total = convertCurrency(toNumber(row.total), row.currency, user.baseCurrency, rate);
    const paid = convertCurrency(toNumber(row.paid), row.currency, user.baseCurrency, rate);
    if (["sent", "partially_paid", "overdue"].includes(row.status)) {
      summary.outstanding += total - paid;
      summary.openCount += row.count;
    }
    if (row.status === "overdue") {
      summary.overdue += total - paid;
      summary.overdueCount += row.count;
    }
    if (row.status === "draft") summary.draftCount += row.count;
    if (row.status !== "cancelled") summary.paidTotal += paid;
  }
  return summary;
}

export async function getInvoiceDetail(userId: string, id: string): Promise<InvoiceDetail | null> {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.userId, userId), eq(invoices.id, id)),
    with: {
      client: true,
      project: { columns: { id: true, name: true, color: true } },
      items: { orderBy: (items, { asc }) => [asc(items.position)] },
      payments: { orderBy: [desc(payments.paidAt), desc(payments.createdAt)] },
    },
  });
  if (!invoice) return null;
  return { ...withComputed(invoice), client: invoice.client, project: invoice.project ?? null, items: invoice.items, payments: invoice.payments };
}

export async function getNextInvoiceSequence(userId: string) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${invoices.sequence}), 0)::int` })
    .from(invoices)
    .where(eq(invoices.userId, userId));
  return (row?.max ?? 0) + 1;
}

export async function listPayments(userId: string, limit = 50): Promise<PaymentListItem[]> {
  const rows = await db
    .select({
      payment: payments,
      invoice: { id: invoices.id, number: invoices.number },
      client: { id: clients.id, name: clients.name, company: clients.company },
    })
    .from(payments)
    .leftJoin(invoices, eq(invoices.id, payments.invoiceId))
    .leftJoin(clients, eq(clients.id, payments.clientId))
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.paidAt), desc(payments.createdAt))
    .limit(limit);
  return rows.map(({ payment, invoice, client }) => ({
    ...payment,
    invoice: invoice?.id ? invoice : null,
    client: client?.id ? client : null,
  }));
}
