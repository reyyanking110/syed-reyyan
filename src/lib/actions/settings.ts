"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { activities, clients, invoices, notifications, payments, portfolioItems, projects, tasks, users } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { invalidateAllUserSessions, invalidateCurrentSession } from "@/lib/auth/session";
import {
  accountEmailSchema,
  businessSchema,
  changePasswordSchema,
  claimGuestSchema,
  deleteAccountSchema,
  flattenErrors,
  profileSchema,
  type ActionResult,
} from "@/lib/validations";
import { failure, KnownError, revalidateApp } from "./helpers";

async function emailInUse(email: string, exceptUserId: string) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${email.toLowerCase()}`, sql`${users.id} <> ${exceptUserId}`))
    .limit(1);
  return !!row;
}

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(sql`lower(${users.username}) = ${data.username}`, sql`${users.id} <> ${user.id}`))
      .limit(1);
    if (taken) return { ok: false, error: "That username is taken.", fieldErrors: { username: ["That username is taken"] } };

    await db.update(users).set({ ...data }).where(eq(users.id, user.id));
    revalidateApp("/settings");
    return { ok: true, data: undefined, message: "Profile saved" };
  } catch (error) {
    return failure(error, "Could not save your profile.");
  }
}

export async function updateBusinessAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = businessSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    await db
      .update(users)
      .set({
        businessName: data.businessName,
        businessAddress: data.businessAddress,
        taxId: data.taxId,
        baseCurrency: data.baseCurrency,
        usdToPkrRate: data.usdToPkrRate.toFixed(4),
        defaultTaxRate: data.defaultTaxRate.toFixed(2),
        defaultPaymentTermsDays: data.defaultPaymentTermsDays,
        invoicePrefix: data.invoicePrefix,
        invoiceNotes: data.invoiceNotes,
        paymentInstructions: data.paymentInstructions,
      })
      .where(eq(users.id, user.id));
    revalidateApp("/settings");
    return { ok: true, data: undefined, message: "Business settings saved" };
  } catch (error) {
    return failure(error, "Could not save business settings.");
  }
}

export async function updateEmailAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = accountEmailSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return { ok: false, error: "Current password is incorrect.", fieldErrors: { currentPassword: ["Incorrect password"] } };
    }
    if (await emailInUse(parsed.data.email, user.id)) {
      return { ok: false, error: "That email is already in use.", fieldErrors: { email: ["That email is already in use"] } };
    }
    await db.update(users).set({ email: parsed.data.email }).where(eq(users.id, user.id));
    revalidateApp("/settings");
    return { ok: true, data: undefined, message: "Email updated" };
  } catch (error) {
    return failure(error, "Could not update your email.");
  }
}

export async function changePasswordAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return { ok: false, error: "Current password is incorrect.", fieldErrors: { currentPassword: ["Incorrect password"] } };
    }
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    revalidateApp("/settings");
    return { ok: true, data: undefined, message: "Password changed" };
  } catch (error) {
    return failure(error, "Could not change your password.");
  }
}

export async function claimGuestAccountAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.isGuest) return { ok: false, error: "This account is already registered." };
  const parsed = claimGuestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    if (await emailInUse(parsed.data.email, user.id)) {
      return { ok: false, error: "That email is already in use.", fieldErrors: { email: ["That email is already in use"] } };
    }
    const passwordHash = await hashPassword(parsed.data.password);
    await db.update(users).set({ email: parsed.data.email, passwordHash, isGuest: false }).where(eq(users.id, user.id));
    revalidateApp("/settings");
    return { ok: true, data: undefined, message: "Your workspace is now saved to your account" };
  } catch (error) {
    return failure(error, "Could not save your account.");
  }
}

export async function removeDemoDataAction(): Promise<ActionResult<{ removed: number }>> {
  const user = await requireUser();
  try {
    const removed = await db.transaction(async (tx) => {
      // Payments & tasks cascade from invoices/projects; delete explicitly for demo-flagged rows too.
      const deletedPayments = await tx.delete(payments).where(and(eq(payments.userId, user.id), eq(payments.isDemo, true))).returning({ id: payments.id });
      const deletedInvoices = await tx.delete(invoices).where(and(eq(invoices.userId, user.id), eq(invoices.isDemo, true))).returning({ id: invoices.id });
      const deletedTasks = await tx.delete(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.isDemo, true))).returning({ id: tasks.id });
      const deletedPortfolio = await tx.delete(portfolioItems).where(and(eq(portfolioItems.userId, user.id), eq(portfolioItems.isDemo, true))).returning({ id: portfolioItems.id });
      const deletedProjects = await tx.delete(projects).where(and(eq(projects.userId, user.id), eq(projects.isDemo, true))).returning({ id: projects.id });
      // Demo clients that still have real (non-demo) invoices are kept to preserve referential integrity.
      const deletedClients = await tx
        .delete(clients)
        .where(
          and(
            eq(clients.userId, user.id),
            eq(clients.isDemo, true),
            sql`not exists (select 1 from ${invoices} where ${invoices.clientId} = ${clients.id})`,
          ),
        )
        .returning({ id: clients.id });
      await tx.delete(notifications).where(and(eq(notifications.userId, user.id), sql`${notifications.createdAt} <= ${user.demoSeededAt ?? new Date()}`));
      await tx.delete(activities).where(and(eq(activities.userId, user.id), sql`${activities.createdAt} <= ${user.demoSeededAt ?? new Date()}`));
      await logActivity(tx, user.id, { action: "cleanup", entityType: "workspace", title: "Removed demo data from the workspace" });
      return (
        deletedPayments.length +
        deletedInvoices.length +
        deletedTasks.length +
        deletedPortfolio.length +
        deletedProjects.length +
        deletedClients.length
      );
    });
    revalidateApp();
    return { ok: true, data: { removed }, message: `Removed ${removed} demo records` };
  } catch (error) {
    return failure(error, "Could not remove demo data.");
  }
}

export async function deleteAccountAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    if (!user.isGuest && !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return { ok: false, error: "Password is incorrect.", fieldErrors: { password: ["Incorrect password"] } };
    }
    await invalidateAllUserSessions(user.id);
    await db.delete(users).where(eq(users.id, user.id));
    await invalidateCurrentSession();
  } catch (error) {
    return failure(error, "Could not delete your account.");
  }
  redirect("/login?deleted=1");
}

export async function exportWorkspaceAction(): Promise<ActionResult<{ json: string; filename: string }>> {
  const user = await requireUser();
  try {
    const [clientRows, projectRows, taskRows, invoiceRows, paymentRows, portfolioRows] = await Promise.all([
      db.select().from(clients).where(eq(clients.userId, user.id)),
      db.select().from(projects).where(eq(projects.userId, user.id)),
      db.select().from(tasks).where(eq(tasks.userId, user.id)),
      db.query.invoices.findMany({ where: eq(invoices.userId, user.id), with: { items: true } }),
      db.select().from(payments).where(eq(payments.userId, user.id)),
      db.select().from(portfolioItems).where(eq(portfolioItems.userId, user.id)),
    ]);
    const { passwordHash, ...profile } = user;
    const json = JSON.stringify(
      { exportedAt: new Date().toISOString(), profile, clients: clientRows, projects: projectRows, tasks: taskRows, invoices: invoiceRows, payments: paymentRows, portfolio: portfolioRows },
      null,
      2,
    );
    return { ok: true, data: { json, filename: `skillorbit-export-${new Date().toISOString().slice(0, 10)}.json` } };
  } catch (error) {
    return failure(error, "Could not export your data.");
  }
}

export async function signOutEverywhereAction(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await invalidateAllUserSessions(user.id);
    await invalidateCurrentSession();
  } catch (error) {
    return failure(error, "Could not sign out of other sessions.");
  }
  redirect("/login");
}

export async function setPortfolioPublicAction(value: boolean): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await db.update(users).set({ portfolioPublic: !!value }).where(eq(users.id, user.id));
    revalidateApp("/portfolio", "/settings", `/p/${user.username}`);
    return { ok: true, data: undefined, message: value ? "Public profile enabled" : "Public profile disabled" };
  } catch (error) {
    return failure(error, "Could not update your public profile.");
  }
}
