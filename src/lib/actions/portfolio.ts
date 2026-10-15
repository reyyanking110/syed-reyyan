"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { portfolioItems } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth/dal";
import { flattenErrors, portfolioSchema, type ActionResult } from "@/lib/validations";
import { failure, KnownError, revalidateApp } from "./helpers";

export async function createPortfolioItemAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = portfolioSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${portfolioItems.position}), 0)::int + 1` })
      .from(portfolioItems)
      .where(eq(portfolioItems.userId, user.id));
    const [created] = await db
      .insert(portfolioItems)
      .values({ ...parsed.data, userId: user.id, position: next })
      .returning({ id: portfolioItems.id });
    await logActivity(db, user.id, { action: "created", entityType: "portfolio", entityId: created.id, title: `Added “${parsed.data.title}” to portfolio` });
    revalidateApp("/portfolio", `/p/${user.username}`);
    return { ok: true, data: { id: created.id }, message: "Portfolio item added" };
  } catch (error) {
    return failure(error, "Could not add the portfolio item.");
  }
}

export async function updatePortfolioItemAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = portfolioSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const [updated] = await db
      .update(portfolioItems)
      .set({ ...parsed.data })
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.userId, user.id)))
      .returning({ id: portfolioItems.id });
    if (!updated) throw new KnownError("Portfolio item not found.");
    revalidateApp("/portfolio", `/p/${user.username}`);
    return { ok: true, data: { id }, message: "Portfolio item updated" };
  } catch (error) {
    return failure(error, "Could not update the portfolio item.");
  }
}

export async function togglePortfolioFlagAction(
  id: string,
  flag: "featured" | "visibility",
  value: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [updated] = await db
      .update(portfolioItems)
      .set(flag === "featured" ? { featured: value } : { visibility: value ? "public" : "private" })
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.userId, user.id)))
      .returning({ id: portfolioItems.id });
    if (!updated) throw new KnownError("Portfolio item not found.");
    revalidateApp("/portfolio", `/p/${user.username}`);
    return { ok: true, data: undefined, message: flag === "featured" ? (value ? "Marked as featured" : "Removed from featured") : value ? "Now visible on your public portfolio" : "Hidden from your public portfolio" };
  } catch (error) {
    return failure(error, "Could not update the portfolio item.");
  }
}

export async function deletePortfolioItemAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [deleted] = await db
      .delete(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.userId, user.id)))
      .returning({ id: portfolioItems.id });
    if (!deleted) throw new KnownError("Portfolio item not found.");
    revalidateApp("/portfolio", `/p/${user.username}`);
    return { ok: true, data: undefined, message: "Portfolio item deleted" };
  } catch (error) {
    return failure(error, "Could not delete the portfolio item.");
  }
}
