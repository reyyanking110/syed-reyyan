"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, type ProjectStatus } from "@/db/schema";
import { logActivity, notify } from "@/lib/activity";
import { requireUser } from "@/lib/auth/dal";
import { flattenErrors, projectSchema, type ActionResult } from "@/lib/validations";
import { failure, KnownError, revalidateApp } from "./helpers";

function toRow(data: ReturnType<typeof projectSchema.parse>) {
  return {
    name: data.name,
    description: data.description,
    clientId: data.clientId,
    status: data.status,
    priority: data.priority,
    billingType: data.billingType,
    budget: data.budget === null ? null : data.budget.toFixed(2),
    hourlyRate: data.hourlyRate === null ? null : data.hourlyRate.toFixed(2),
    currency: data.currency,
    startDate: data.startDate,
    dueDate: data.dueDate,
    color: data.color,
    tags: data.tags,
  };
}

export async function createProjectAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const [created] = await db
      .insert(projects)
      .values({
        ...toRow(parsed.data),
        userId: user.id,
        completedAt: parsed.data.status === "completed" ? new Date() : null,
      })
      .returning({ id: projects.id });
    await logActivity(db, user.id, {
      action: "created",
      entityType: "project",
      entityId: created.id,
      title: `Created project ${parsed.data.name}`,
    });
    revalidateApp("/projects");
    return { ok: true, data: { id: created.id }, message: "Project created" };
  } catch (error) {
    return failure(error, "Could not create the project.");
  }
}

export async function updateProjectAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const [existing] = await db
      .select({ status: projects.status, completedAt: projects.completedAt })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .limit(1);
    if (!existing) throw new KnownError("Project not found.");

    const completedAt =
      parsed.data.status === "completed" ? (existing.completedAt ?? new Date()) : null;

    await db
      .update(projects)
      .set({ ...toRow(parsed.data), completedAt })
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)));

    if (existing.status !== "completed" && parsed.data.status === "completed") {
      await logActivity(db, user.id, { action: "completed", entityType: "project", entityId: id, title: `Completed project ${parsed.data.name}` });
      await notify(db, user.id, { type: "project", title: `Project completed: ${parsed.data.name}`, body: "Nice work! Consider adding it to your portfolio.", href: "/portfolio" });
    }
    revalidateApp("/projects", `/projects/${id}`);
    return { ok: true, data: { id }, message: "Project updated" };
  } catch (error) {
    return failure(error, "Could not update the project.");
  }
}

export async function updateProjectStatusAction(id: string, status: ProjectStatus): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [existing] = await db
      .select({ name: projects.name, status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .limit(1);
    if (!existing) throw new KnownError("Project not found.");

    await db
      .update(projects)
      .set({ status, completedAt: status === "completed" ? new Date() : null })
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)));

    if (status === "completed" && existing.status !== "completed") {
      await logActivity(db, user.id, { action: "completed", entityType: "project", entityId: id, title: `Completed project ${existing.name}` });
      await notify(db, user.id, { type: "project", title: `Project completed: ${existing.name}`, body: "Nice work! Consider adding it to your portfolio.", href: "/portfolio" });
    }
    revalidateApp("/projects", `/projects/${id}`);
    return { ok: true, data: undefined, message: "Status updated" };
  } catch (error) {
    return failure(error, "Could not update the status.");
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [deleted] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .returning({ name: projects.name });
    if (!deleted) throw new KnownError("Project not found.");
    await logActivity(db, user.id, { action: "deleted", entityType: "project", title: `Deleted project ${deleted.name}` });
    revalidateApp("/projects");
    return { ok: true, data: undefined, message: "Project deleted" };
  } catch (error) {
    return failure(error, "Could not delete the project.");
  }
}
