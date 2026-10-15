import "server-only";
import { addDays, format, startOfWeek, endOfWeek } from "date-fns";
import { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks, type Priority, type TaskStatus } from "@/db/schema";
import type { TaskListItem } from "@/lib/types";

export type TaskFilters = {
  q?: string;
  status?: TaskStatus | "all" | "open";
  priority?: Priority | "all";
  projectId?: string | "none";
  due?: "all" | "overdue" | "today" | "week" | "none";
  sort?: "due" | "priority" | "recent";
};

const PRIORITY_RANK = sql`case ${tasks.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;

export function buildTaskConditions(userId: string, filters: TaskFilters) {
  const today = format(new Date(), "yyyy-MM-dd");
  const conditions: SQL[] = [eq(tasks.userId, userId)];
  if (filters.status === "open") conditions.push(sql`${tasks.status} <> 'done'`);
  else if (filters.status && filters.status !== "all") conditions.push(eq(tasks.status, filters.status));
  if (filters.priority && filters.priority !== "all") conditions.push(eq(tasks.priority, filters.priority));
  if (filters.projectId === "none") conditions.push(isNull(tasks.projectId));
  else if (filters.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
  if (filters.due === "overdue") conditions.push(and(isNotNull(tasks.dueDate), lt(tasks.dueDate, today), sql`${tasks.status} <> 'done'`)!);
  if (filters.due === "today") conditions.push(eq(tasks.dueDate, today));
  if (filters.due === "week") {
    const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    conditions.push(and(gte(tasks.dueDate, start), lte(tasks.dueDate, end))!);
  }
  if (filters.due === "none") conditions.push(isNull(tasks.dueDate));
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(tasks.title, term), ilike(tasks.description, term), ilike(projects.name, term))!);
  }
  return conditions;
}

export async function listTasks(userId: string, filters: TaskFilters = {}): Promise<TaskListItem[]> {
  const conditions = buildTaskConditions(userId, filters);
  const orderBy =
    filters.sort === "priority"
      ? [PRIORITY_RANK, sql`${tasks.dueDate} asc nulls last`]
      : filters.sort === "recent"
        ? [desc(tasks.createdAt)]
        : [sql`${tasks.dueDate} asc nulls last`, PRIORITY_RANK, asc(tasks.position)];

  const rows = await db
    .select({ task: tasks, project: { id: projects.id, name: projects.name, color: projects.color } })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(...conditions))
    .orderBy(...orderBy);

  return rows.map(({ task, project }) => ({ ...task, project: project?.id ? project : null }));
}

export async function getTaskSummary(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
      done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
      overdue: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} < ${today})::int`,
      dueToday: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} = ${today})::int`,
      dueWeek: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} >= ${today} and ${tasks.dueDate} <= ${weekEnd})::int`,
      inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'in_progress')::int`,
      review: sql<number>`count(*) filter (where ${tasks.status} = 'review')::int`,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId));
  return row;
}

export async function getTaskById(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .limit(1);
  return row ?? null;
}
