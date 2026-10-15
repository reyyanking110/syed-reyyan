import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, portfolioItems, projects, tasks } from "@/db/schema";

export type SearchResult = {
  id: string;
  type: "client" | "project" | "task" | "invoice" | "portfolio";
  title: string;
  subtitle: string | null;
  href: string;
};

export async function globalSearch(userId: string, query: string, limit = 6): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const term = `%${q}%`;

  const [clientRows, projectRows, taskRows, invoiceRows, portfolioRows] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name, company: clients.company })
      .from(clients)
      .where(and(eq(clients.userId, userId), or(ilike(clients.name, term), ilike(clients.company, term), ilike(clients.email, term))))
      .orderBy(desc(clients.updatedAt))
      .limit(limit),
    db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(and(eq(projects.userId, userId), ilike(projects.name, term)))
      .orderBy(desc(projects.updatedAt))
      .limit(limit),
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, projectId: tasks.projectId })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), ilike(tasks.title, term)))
      .orderBy(desc(tasks.updatedAt))
      .limit(limit),
    db
      .select({ id: invoices.id, number: invoices.number, status: invoices.status, total: invoices.total, currency: invoices.currency })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), ilike(invoices.number, term)))
      .orderBy(desc(invoices.issueDate))
      .limit(limit),
    db
      .select({ id: portfolioItems.id, title: portfolioItems.title, category: portfolioItems.category })
      .from(portfolioItems)
      .where(and(eq(portfolioItems.userId, userId), ilike(portfolioItems.title, term)))
      .limit(limit),
  ]);

  return [
    ...clientRows.map<SearchResult>((row) => ({ id: row.id, type: "client", title: row.company ?? row.name, subtitle: row.company ? row.name : null, href: `/clients/${row.id}` })),
    ...projectRows.map<SearchResult>((row) => ({ id: row.id, type: "project", title: row.name, subtitle: row.status.replace("_", " "), href: `/projects/${row.id}` })),
    ...taskRows.map<SearchResult>((row) => ({ id: row.id, type: "task", title: row.title, subtitle: row.status.replace("_", " "), href: row.projectId ? `/projects/${row.projectId}` : `/tasks?q=${encodeURIComponent(row.title)}` })),
    ...invoiceRows.map<SearchResult>((row) => ({ id: row.id, type: "invoice", title: row.number, subtitle: `${row.status.replace("_", " ")} · ${row.currency} ${row.total}`, href: `/invoices/${row.id}` })),
    ...portfolioRows.map<SearchResult>((row) => ({ id: row.id, type: "portfolio", title: row.title, subtitle: row.category, href: `/portfolio?q=${encodeURIComponent(row.title)}` })),
  ];
}
