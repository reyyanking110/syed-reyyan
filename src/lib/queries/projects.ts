import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, projects, tasks, type ProjectStatus, type User } from "@/db/schema";
import type { ProjectListItem, ProjectOption } from "@/lib/types";
import { percent, toNumber } from "@/lib/utils";

export type ProjectFilters = {
  q?: string;
  status?: ProjectStatus | "all" | "active";
  clientId?: string;
  sort?: "recent" | "due" | "name";
};

export async function listProjects(user: User, filters: ProjectFilters = {}): Promise<ProjectListItem[]> {
  const conditions: SQL[] = [eq(projects.userId, user.id)];
  if (filters.status === "active") conditions.push(inArray(projects.status, ["planning", "in_progress"]));
  else if (filters.status && filters.status !== "all") conditions.push(eq(projects.status, filters.status));
  if (filters.clientId) conditions.push(eq(projects.clientId, filters.clientId));
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(projects.name, term), ilike(projects.description, term), ilike(clients.company, term), ilike(clients.name, term))!);
  }

  const orderBy =
    filters.sort === "name"
      ? [asc(projects.name)]
      : filters.sort === "due"
        ? [sql`${projects.dueDate} asc nulls last`, desc(projects.updatedAt)]
        : [desc(projects.updatedAt)];

  const rows = await db
    .select({
      project: projects,
      client: { id: clients.id, name: clients.name, company: clients.company, color: clients.color },
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(...conditions))
    .orderBy(...orderBy);

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.project.id);

  const [taskAgg, invoiceAgg] = await Promise.all([
    db
      .select({
        projectId: tasks.projectId,
        total: sql<number>`count(*)::int`,
        done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), inArray(tasks.projectId, ids)))
      .groupBy(tasks.projectId),
    db
      .select({
        projectId: invoices.projectId,
        invoiced: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} not in ('cancelled','draft')), 0)`,
        paid: sql<string>`coalesce(sum(${invoices.amountPaid}) filter (where ${invoices.status} <> 'cancelled'), 0)`,
      })
      .from(invoices)
      .where(and(eq(invoices.userId, user.id), inArray(invoices.projectId, ids)))
      .groupBy(invoices.projectId),
  ]);

  const taskMap = new Map(taskAgg.map((row) => [row.projectId, row]));
  const invoiceMap = new Map(invoiceAgg.map((row) => [row.projectId, row]));

  return rows.map<ProjectListItem>(({ project, client }) => {
    const t = taskMap.get(project.id);
    const i = invoiceMap.get(project.id);
    const taskCount = t?.total ?? 0;
    const doneTaskCount = t?.done ?? 0;
    const progress =
      project.status === "completed" ? 100 : taskCount > 0 ? percent(doneTaskCount, taskCount) : project.status === "planning" ? 0 : 10;
    return {
      ...project,
      client: client?.id ? client : null,
      taskCount,
      doneTaskCount,
      invoicedTotal: toNumber(i?.invoiced),
      paidTotal: toNumber(i?.paid),
      progress,
    };
  });
}

export async function getProjectOptions(userId: string): Promise<ProjectOption[]> {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      currency: projects.currency,
      clientId: projects.clientId,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.name));
}

export async function getProjectDetail(user: User, id: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.userId, user.id), eq(projects.id, id)),
    with: {
      client: true,
      tasks: { orderBy: [asc(tasks.position), asc(tasks.createdAt)] },
      invoices: {
        orderBy: [desc(invoices.issueDate), desc(invoices.sequence)],
        with: { client: { columns: { id: true, name: true, company: true, color: true } } },
      },
    },
  });
  if (!project) return null;

  const taskCount = project.tasks.length;
  const doneTaskCount = project.tasks.filter((task) => task.status === "done").length;
  const invoiced = project.invoices
    .filter((invoice) => invoice.status !== "cancelled" && invoice.status !== "draft")
    .reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const paid = project.invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + toNumber(invoice.amountPaid), 0);
  const estimatedHours = project.tasks.reduce((sum, task) => sum + toNumber(task.estimatedHours), 0);
  const completedHours = project.tasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + toNumber(task.estimatedHours), 0);

  return {
    ...project,
    stats: {
      taskCount,
      doneTaskCount,
      progress: project.status === "completed" ? 100 : taskCount ? percent(doneTaskCount, taskCount) : 0,
      invoiced,
      paid,
      outstanding: Math.max(0, invoiced - paid),
      budget: toNumber(project.budget, 0) || null,
      estimatedHours,
      completedHours,
    },
  };
}

export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>;
