"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks, type TaskStatus } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth/dal";
import { flattenErrors, quickTaskSchema, taskSchema, type ActionResult } from "@/lib/validations";
import { failure, KnownError, revalidateApp } from "./helpers";

export async function createTaskAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${tasks.position}), 0)::int + 1` })
      .from(tasks)
      .where(eq(tasks.userId, user.id));
    const [created] = await db
      .insert(tasks)
      .values({
        userId: user.id,
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours === null ? null : data.estimatedHours.toFixed(2),
        position: next,
        completedAt: data.status === "done" ? new Date() : null,
      })
      .returning({ id: tasks.id });
    revalidateApp("/tasks");
    return { ok: true, data: { id: created.id }, message: "Task added" };
  } catch (error) {
    return failure(error, "Could not create the task.");
  }
}

export async function quickCreateTaskAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = quickTaskSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };
  return createTaskAction({ ...parsed.data, status: "todo" });
}

export async function updateTaskAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    const [existing] = await db
      .select({ status: tasks.status, completedAt: tasks.completedAt })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .limit(1);
    if (!existing) throw new KnownError("Task not found.");

    await db
      .update(tasks)
      .set({
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours === null ? null : data.estimatedHours.toFixed(2),
        completedAt: data.status === "done" ? (existing.completedAt ?? new Date()) : null,
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    if (existing.status !== "done" && data.status === "done") {
      await logActivity(db, user.id, { action: "completed", entityType: "task", entityId: id, title: `Completed “${data.title}”` });
    }
    revalidateApp("/tasks");
    return { ok: true, data: { id }, message: "Task updated" };
  } catch (error) {
    return failure(error, "Could not update the task.");
  }
}

export async function updateTaskStatusAction(id: string, status: TaskStatus): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [existing] = await db
      .select({ title: tasks.title, status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .limit(1);
    if (!existing) throw new KnownError("Task not found.");

    await db
      .update(tasks)
      .set({ status, completedAt: status === "done" ? new Date() : null })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    if (status === "done" && existing.status !== "done") {
      await logActivity(db, user.id, { action: "completed", entityType: "task", entityId: id, title: `Completed “${existing.title}”` });
    }
    revalidateApp("/tasks");
    return { ok: true, data: undefined, message: status === "done" ? "Task completed" : "Task updated" };
  } catch (error) {
    return failure(error, "Could not update the task.");
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning({ id: tasks.id });
    if (!deleted) throw new KnownError("Task not found.");
    revalidateApp("/tasks");
    return { ok: true, data: undefined, message: "Task deleted" };
  } catch (error) {
    return failure(error, "Could not delete the task.");
  }
}
