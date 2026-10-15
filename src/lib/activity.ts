import "server-only";
import type { Database, Transaction } from "@/db";
import { activities, notifications, type NotificationType } from "@/db/schema";

type Executor = Database | Transaction;

export async function logActivity(
  executor: Executor,
  userId: string,
  input: { action: string; entityType: string; entityId?: string | null; title: string; meta?: Record<string, unknown> },
) {
  await executor.insert(activities).values({
    userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    title: input.title,
    meta: input.meta ?? null,
  });
}

export async function notify(
  executor: Executor,
  userId: string,
  input: { type?: NotificationType; title: string; body?: string | null; href?: string | null },
) {
  await executor.insert(notifications).values({
    userId,
    type: input.type ?? "info",
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
  });
}
