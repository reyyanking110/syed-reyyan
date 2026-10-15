"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { globalSearch } from "@/lib/queries/search";
import type { ActionResult } from "@/lib/validations";
import { failure, revalidateApp } from "./helpers";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id), isNull(notifications.readAt)));
    revalidateApp("/notifications");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Could not update the notification.");
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    revalidateApp("/notifications");
    return { ok: true, data: undefined, message: "All notifications marked as read" };
  } catch (error) {
    return failure(error, "Could not update notifications.");
  }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
    revalidateApp("/notifications");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Could not delete the notification.");
  }
}

export async function searchAction(query: string) {
  const user = await requireUser();
  return globalSearch(user.id, query);
}
