"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth/dal";
import { pickColor } from "@/lib/utils";
import { clientSchema, flattenErrors, type ActionResult } from "@/lib/validations";
import { failure, KnownError, revalidateApp } from "./helpers";

export async function createClientAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    const [created] = await db
      .insert(clients)
      .values({ ...data, userId: user.id, color: pickColor(data.company ?? data.name) })
      .returning({ id: clients.id });
    await logActivity(db, user.id, {
      action: "created",
      entityType: "client",
      entityId: created.id,
      title: `Added client ${data.company ?? data.name}`,
    });
    revalidateApp("/clients");
    return { ok: true, data: { id: created.id }, message: "Client added" };
  } catch (error) {
    return failure(error, "Could not create the client.");
  }
}

export async function updateClientAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const [updated] = await db
      .update(clients)
      .set({ ...parsed.data })
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .returning({ id: clients.id });
    if (!updated) throw new KnownError("Client not found.");
    revalidateApp("/clients", `/clients/${id}`);
    return { ok: true, data: { id }, message: "Client updated" };
  } catch (error) {
    return failure(error, "Could not update the client.");
  }
}

export async function updateClientStatusAction(id: string, status: "lead" | "active" | "inactive"): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [updated] = await db
      .update(clients)
      .set({ status })
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .returning({ id: clients.id });
    if (!updated) throw new KnownError("Client not found.");
    revalidateApp("/clients", `/clients/${id}`);
    return { ok: true, data: undefined, message: "Status updated" };
  } catch (error) {
    return failure(error, "Could not update the status.");
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [existing] = await db
      .select({ id: clients.id, name: clients.name, company: clients.company })
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .limit(1);
    if (!existing) throw new KnownError("Client not found.");

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.clientId, id));
    if (count > 0) {
      throw new KnownError(
        `This client has ${count} invoice${count === 1 ? "" : "s"}. Delete or reassign them first, or mark the client as inactive instead.`,
      );
    }

    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, user.id)));
    await logActivity(db, user.id, {
      action: "deleted",
      entityType: "client",
      title: `Removed client ${existing.company ?? existing.name}`,
    });
    revalidateApp("/clients");
    return { ok: true, data: undefined, message: "Client deleted" };
  } catch (error) {
    return failure(error, "Could not delete the client.");
  }
}
