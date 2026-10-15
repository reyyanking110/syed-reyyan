import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, projects, type Client, type ClientStatus, type Currency, type User } from "@/db/schema";
import { convertCurrency } from "@/lib/money";
import type { ClientListItem, ClientOption } from "@/lib/types";
import { toNumber } from "@/lib/utils";

export type ClientFilters = {
  q?: string;
  status?: ClientStatus | "all";
  sort?: "recent" | "name" | "billed";
};

export async function listClients(user: User, filters: ClientFilters = {}): Promise<ClientListItem[]> {
  const conditions: SQL[] = [eq(clients.userId, user.id)];
  if (filters.status && filters.status !== "all") conditions.push(eq(clients.status, filters.status));
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(ilike(clients.name, term), ilike(clients.company, term), ilike(clients.email, term), ilike(clients.city, term))!,
    );
  }

  const orderBy =
    filters.sort === "name" ? [asc(clients.name)] : [desc(clients.updatedAt), desc(clients.createdAt)];

  const rows = await db
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(...orderBy);

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);

  const [projectAgg, invoiceAgg] = await Promise.all([
    db
      .select({
        clientId: projects.clientId,
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${projects.status} in ('planning','in_progress'))::int`,
      })
      .from(projects)
      .where(and(eq(projects.userId, user.id), inArray(projects.clientId, ids)))
      .groupBy(projects.clientId),
    db
      .select({
        clientId: invoices.clientId,
        currency: invoices.currency,
        count: sql<number>`count(*)::int`,
        billed: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} <> 'cancelled' and ${invoices.status} <> 'draft'), 0)`,
        paid: sql<string>`coalesce(sum(${invoices.amountPaid}) filter (where ${invoices.status} <> 'cancelled'), 0)`,
        outstanding: sql<string>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}) filter (where ${invoices.status} in ('sent','partially_paid','overdue')), 0)`,
      })
      .from(invoices)
      .where(and(eq(invoices.userId, user.id), inArray(invoices.clientId, ids)))
      .groupBy(invoices.clientId, invoices.currency),
  ]);

  const projectMap = new Map(projectAgg.map((row) => [row.clientId, row]));
  const invoiceMap = new Map<string, { count: number; billed: number; paid: number; outstanding: number }>();
  const rate = toNumber(user.usdToPkrRate, 278.5);
  for (const row of invoiceAgg) {
    const entry = invoiceMap.get(row.clientId) ?? { count: 0, billed: 0, paid: 0, outstanding: 0 };
    entry.count += row.count;
    entry.billed += convertCurrency(toNumber(row.billed), row.currency as Currency, user.baseCurrency, rate);
    entry.paid += convertCurrency(toNumber(row.paid), row.currency as Currency, user.baseCurrency, rate);
    entry.outstanding += convertCurrency(toNumber(row.outstanding), row.currency as Currency, user.baseCurrency, rate);
    invoiceMap.set(row.clientId, entry);
  }

  const items = rows.map<ClientListItem>((client) => {
    const p = projectMap.get(client.id);
    const i = invoiceMap.get(client.id);
    return {
      ...client,
      projectCount: p?.total ?? 0,
      activeProjectCount: p?.active ?? 0,
      invoiceCount: i?.count ?? 0,
      totalBilledBase: i?.billed ?? 0,
      paidBase: i?.paid ?? 0,
      outstandingBase: i?.outstanding ?? 0,
    };
  });

  if (filters.sort === "billed") items.sort((a, b) => b.totalBilledBase - a.totalBilledBase);
  return items;
}

export async function getClientOptions(userId: string): Promise<ClientOption[]> {
  return db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      currency: clients.currency,
      color: clients.color,
    })
    .from(clients)
    .where(eq(clients.userId, userId))
    .orderBy(asc(clients.company), asc(clients.name));
}

export async function getClientById(userId: string, id: string): Promise<Client | null> {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getClientDetail(user: User, id: string) {
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.userId, user.id), eq(clients.id, id)),
    with: {
      projects: {
        orderBy: [desc(projects.updatedAt)],
        with: { tasks: { columns: { id: true, status: true } } },
      },
      invoices: {
        orderBy: [desc(invoices.issueDate), desc(invoices.sequence)],
        with: { project: { columns: { id: true, name: true } } },
      },
      payments: { orderBy: (payments, { desc }) => [desc(payments.paidAt)], limit: 20 },
    },
  });
  if (!client) return null;

  const rate = toNumber(user.usdToPkrRate, 278.5);
  const stats = client.invoices.reduce(
    (acc, invoice) => {
      const total = toNumber(invoice.total);
      const paid = toNumber(invoice.amountPaid);
      const toBase = (value: number) => convertCurrency(value, invoice.currency, user.baseCurrency, rate);
      if (invoice.status !== "cancelled" && invoice.status !== "draft") acc.billed += toBase(total);
      if (invoice.status !== "cancelled") acc.paid += toBase(paid);
      if (["sent", "partially_paid", "overdue"].includes(invoice.status)) acc.outstanding += toBase(total - paid);
      if (invoice.status === "overdue") acc.overdue += 1;
      return acc;
    },
    { billed: 0, paid: 0, outstanding: 0, overdue: 0 },
  );

  return {
    ...client,
    stats: {
      ...stats,
      projectCount: client.projects.length,
      activeProjects: client.projects.filter((p) => p.status === "in_progress" || p.status === "planning").length,
      invoiceCount: client.invoices.length,
    },
  };
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;
