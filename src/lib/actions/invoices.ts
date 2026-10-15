"use server";

import { addDays, format } from "date-fns";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { clients, invoiceItems, invoices, payments, type InvoiceStatus } from "@/db/schema";
import { logActivity, notify } from "@/lib/activity";
import { requireUser } from "@/lib/auth/dal";
import { formatMoney } from "@/lib/money";
import { getNextInvoiceSequence } from "@/lib/queries/invoices";
import { roundMoney, toNumber } from "@/lib/utils";
import { flattenErrors, invoiceSchema, paymentSchema, type ActionResult, type InvoiceFormValues } from "@/lib/validations";
import { failure, KnownError, revalidateApp } from "./helpers";

function computeTotals(data: Pick<InvoiceFormValues, "items" | "taxRate" | "discount">) {
  const items = data.items.map((item, position) => {
    const amount = roundMoney(item.quantity * item.unitPrice);
    return { description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, amount, position };
  });
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const taxAmount = roundMoney((subtotal * data.taxRate) / 100);
  const discount = Math.min(roundMoney(data.discount), roundMoney(subtotal + taxAmount));
  const total = roundMoney(subtotal + taxAmount - discount);
  return { items, subtotal, taxAmount, discount, total };
}

async function assertClient(userId: string, clientId: string) {
  const [client] = await db
    .select({ id: clients.id, name: clients.name, company: clients.company })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  if (!client) throw new KnownError("Select a valid client.");
  return client;
}

/** Derives the invoice status from the amount paid, respecting draft/cancelled states. */
function deriveStatus(current: InvoiceStatus, total: number, amountPaid: number, dueDate: string): InvoiceStatus {
  if (current === "draft" || current === "cancelled") return current;
  if (amountPaid >= total - 0.005 && total > 0) return "paid";
  if (amountPaid > 0) return dueDate < format(new Date(), "yyyy-MM-dd") ? "overdue" : "partially_paid";
  return dueDate < format(new Date(), "yyyy-MM-dd") ? "overdue" : "sent";
}

async function syncInvoicePayments(tx: Transaction, invoiceId: string, userId: string) {
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);
  if (!invoice) throw new KnownError("Invoice not found.");
  const [{ paid }] = await tx
    .select({ paid: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  const amountPaid = roundMoney(toNumber(paid));
  const total = toNumber(invoice.total);
  const status = deriveStatus(invoice.status, total, amountPaid, invoice.dueDate);
  await tx
    .update(invoices)
    .set({
      amountPaid: amountPaid.toFixed(2),
      status,
      paidAt: status === "paid" ? (invoice.paidAt ?? new Date()) : null,
    })
    .where(eq(invoices.id, invoiceId));
  return { ...invoice, amountPaid, status, total };
}

export async function createInvoiceAction(raw: unknown): Promise<ActionResult<{ id: string; number: string }>> {
  const user = await requireUser();
  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    const client = await assertClient(user.id, data.clientId);
    const totals = computeTotals(data);

    const result = await db.transaction(async (tx) => {
      const sequence = await getNextInvoiceSequence(user.id);
      const number = `${user.invoicePrefix}-${String(sequence).padStart(4, "0")}`;
      const [created] = await tx
        .insert(invoices)
        .values({
          userId: user.id,
          clientId: data.clientId,
          projectId: data.projectId,
          sequence,
          number,
          status: data.status,
          currency: data.currency,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          subtotal: totals.subtotal.toFixed(2),
          taxRate: data.taxRate.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          discount: totals.discount.toFixed(2),
          total: totals.total.toFixed(2),
          amountPaid: "0.00",
          notes: data.notes,
          terms: data.terms,
          sentAt: data.status === "sent" ? new Date() : null,
        })
        .returning({ id: invoices.id, number: invoices.number });

      await tx.insert(invoiceItems).values(
        totals.items.map((item) => ({
          invoiceId: created.id,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          amount: item.amount.toFixed(2),
          position: item.position,
        })),
      );

      await logActivity(tx, user.id, {
        action: data.status === "sent" ? "sent" : "created",
        entityType: "invoice",
        entityId: created.id,
        title: `${data.status === "sent" ? "Sent" : "Drafted"} invoice ${created.number} for ${client.company ?? client.name}`,
        meta: { amount: formatMoney(totals.total, data.currency) },
      });
      return created;
    });

    revalidateApp("/invoices");
    return { ok: true, data: result, message: `Invoice ${result.number} ${data.status === "sent" ? "sent" : "saved as draft"}` };
  } catch (error) {
    return failure(error, "Could not create the invoice.");
  }
}

export async function updateInvoiceAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    await assertClient(user.id, data.clientId);
    const totals = computeTotals(data);

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
        .limit(1);
      if (!existing) throw new KnownError("Invoice not found.");
      if (existing.status === "paid") throw new KnownError("Paid invoices cannot be edited. Duplicate it instead.");

      const amountPaid = toNumber(existing.amountPaid);
      const nextStatus: InvoiceStatus =
        existing.status === "draft" && data.status === "sent"
          ? "sent"
          : existing.status === "draft"
            ? "draft"
            : deriveStatus(existing.status, totals.total, amountPaid, data.dueDate);

      await tx
        .update(invoices)
        .set({
          clientId: data.clientId,
          projectId: data.projectId,
          currency: data.currency,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          subtotal: totals.subtotal.toFixed(2),
          taxRate: data.taxRate.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          discount: totals.discount.toFixed(2),
          total: totals.total.toFixed(2),
          notes: data.notes,
          terms: data.terms,
          status: nextStatus,
          sentAt: nextStatus !== "draft" ? (existing.sentAt ?? new Date()) : null,
          paidAt: nextStatus === "paid" ? (existing.paidAt ?? new Date()) : null,
        })
        .where(eq(invoices.id, id));

      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await tx.insert(invoiceItems).values(
        totals.items.map((item) => ({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          amount: item.amount.toFixed(2),
          position: item.position,
        })),
      );
    });

    revalidateApp("/invoices", `/invoices/${id}`);
    return { ok: true, data: { id }, message: "Invoice updated" };
  } catch (error) {
    return failure(error, "Could not update the invoice.");
  }
}

export async function updateInvoiceStatusAction(
  id: string,
  action: "send" | "mark_paid" | "cancel" | "reopen" | "revert_draft",
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const message = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({ invoice: invoices, client: { name: clients.name, company: clients.company } })
        .from(invoices)
        .innerJoin(clients, eq(clients.id, invoices.clientId))
        .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
        .limit(1)
        .then((rows) => rows);
      if (!invoice) throw new KnownError("Invoice not found.");
      const row = invoice.invoice;
      const clientName = invoice.client.company ?? invoice.client.name;
      const total = toNumber(row.total);

      switch (action) {
        case "send": {
          if (row.status !== "draft") throw new KnownError("Only draft invoices can be sent.");
          const status = row.dueDate < format(new Date(), "yyyy-MM-dd") ? "overdue" : "sent";
          await tx.update(invoices).set({ status, sentAt: new Date() }).where(eq(invoices.id, id));
          await logActivity(tx, user.id, { action: "sent", entityType: "invoice", entityId: id, title: `Sent invoice ${row.number} to ${clientName}`, meta: { amount: formatMoney(total, row.currency) } });
          return `Invoice ${row.number} marked as sent`;
        }
        case "mark_paid": {
          if (row.status === "paid") throw new KnownError("Invoice is already paid.");
          if (row.status === "draft" || row.status === "cancelled") throw new KnownError("Send the invoice before marking it as paid.");
          const remaining = roundMoney(total - toNumber(row.amountPaid));
          if (remaining > 0) {
            await tx.insert(payments).values({
              userId: user.id,
              invoiceId: id,
              clientId: row.clientId,
              amount: remaining.toFixed(2),
              currency: row.currency,
              method: "bank_transfer",
              paidAt: format(new Date(), "yyyy-MM-dd"),
              notes: "Marked as paid",
            });
          }
          await syncInvoicePayments(tx, id, user.id);
          await logActivity(tx, user.id, { action: "payment", entityType: "invoice", entityId: id, title: `Invoice ${row.number} paid in full by ${clientName}`, meta: { amount: formatMoney(total, row.currency) } });
          await notify(tx, user.id, { type: "payment", title: `Payment received — ${formatMoney(remaining > 0 ? remaining : total, row.currency)}`, body: `${clientName} settled invoice ${row.number}.`, href: `/invoices/${id}` });
          return `Invoice ${row.number} marked as paid`;
        }
        case "cancel": {
          if (row.status === "paid") throw new KnownError("Paid invoices cannot be cancelled.");
          await tx.update(invoices).set({ status: "cancelled" }).where(eq(invoices.id, id));
          await logActivity(tx, user.id, { action: "cancelled", entityType: "invoice", entityId: id, title: `Cancelled invoice ${row.number}` });
          return `Invoice ${row.number} cancelled`;
        }
        case "reopen": {
          if (row.status !== "cancelled") throw new KnownError("Only cancelled invoices can be reopened.");
          await tx.update(invoices).set({ status: row.sentAt ? "sent" : "draft" }).where(eq(invoices.id, id));
          await syncInvoicePayments(tx, id, user.id);
          return `Invoice ${row.number} reopened`;
        }
        case "revert_draft": {
          if (toNumber(row.amountPaid) > 0) throw new KnownError("Invoices with payments cannot be reverted to draft.");
          await tx.update(invoices).set({ status: "draft", sentAt: null }).where(eq(invoices.id, id));
          return `Invoice ${row.number} is now a draft`;
        }
        default:
          throw new KnownError("Unknown action.");
      }
    });
    revalidateApp("/invoices", `/invoices/${id}`);
    return { ok: true, data: undefined, message };
  } catch (error) {
    return failure(error, "Could not update the invoice.");
  }
}

export async function recordPaymentAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  try {
    const data = parsed.data;
    const result = await db.transaction(async (tx) => {
      let clientId = data.clientId;
      let currency = data.currency;
      let invoiceNumber: string | null = null;
      let clientName = "a client";

      if (data.invoiceId) {
        const [invoice] = await tx
          .select({ invoice: invoices, client: { name: clients.name, company: clients.company } })
          .from(invoices)
          .innerJoin(clients, eq(clients.id, invoices.clientId))
          .where(and(eq(invoices.id, data.invoiceId), eq(invoices.userId, user.id)))
          .limit(1);
        if (!invoice) throw new KnownError("Invoice not found.");
        if (invoice.invoice.status === "cancelled") throw new KnownError("This invoice is cancelled.");
        if (invoice.invoice.status === "draft") throw new KnownError("Send the invoice before recording a payment.");
        const remaining = roundMoney(toNumber(invoice.invoice.total) - toNumber(invoice.invoice.amountPaid));
        if (data.amount > remaining + 0.005) {
          throw new KnownError(`Amount exceeds the outstanding balance of ${formatMoney(remaining, invoice.invoice.currency)}.`);
        }
        clientId = invoice.invoice.clientId;
        currency = invoice.invoice.currency;
        invoiceNumber = invoice.invoice.number;
        clientName = invoice.client.company ?? invoice.client.name;
      } else if (clientId) {
        const client = await assertClient(user.id, clientId);
        clientName = client.company ?? client.name;
      }

      const [created] = await tx
        .insert(payments)
        .values({
          userId: user.id,
          invoiceId: data.invoiceId,
          clientId,
          amount: data.amount.toFixed(2),
          currency,
          method: data.method,
          paidAt: data.paidAt,
          reference: data.reference,
          notes: data.notes,
        })
        .returning({ id: payments.id });

      let settled = false;
      if (data.invoiceId) {
        const synced = await syncInvoicePayments(tx, data.invoiceId, user.id);
        settled = synced.status === "paid";
      }

      await logActivity(tx, user.id, {
        action: "payment",
        entityType: "payment",
        entityId: created.id,
        title: `Recorded payment of ${formatMoney(data.amount, currency)} from ${clientName}${invoiceNumber ? ` (${invoiceNumber})` : ""}`,
      });
      await notify(tx, user.id, {
        type: "payment",
        title: `Payment received — ${formatMoney(data.amount, currency)}`,
        body: invoiceNumber ? `${clientName} paid ${settled ? "the balance of" : "towards"} invoice ${invoiceNumber}.` : `From ${clientName}.`,
        href: data.invoiceId ? `/invoices/${data.invoiceId}` : "/invoices?tab=payments",
      });
      return created;
    });

    revalidateApp("/invoices", data.invoiceId ? `/invoices/${data.invoiceId}` : "/invoices");
    return { ok: true, data: { id: result.id }, message: "Payment recorded" };
  } catch (error) {
    return failure(error, "Could not record the payment.");
  }
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(payments)
        .where(and(eq(payments.id, id), eq(payments.userId, user.id)))
        .returning({ invoiceId: payments.invoiceId });
      if (!deleted) throw new KnownError("Payment not found.");
      if (deleted.invoiceId) await syncInvoicePayments(tx, deleted.invoiceId, user.id);
    });
    revalidateApp("/invoices");
    return { ok: true, data: undefined, message: "Payment removed" };
  } catch (error) {
    return failure(error, "Could not remove the payment.");
  }
}

export async function duplicateInvoiceAction(id: string): Promise<ActionResult<{ id: string; number: string }>> {
  const user = await requireUser();
  try {
    const created = await db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
        .limit(1);
      if (!source) throw new KnownError("Invoice not found.");
      const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      const sequence = await getNextInvoiceSequence(user.id);
      const number = `${user.invoicePrefix}-${String(sequence).padStart(4, "0")}`;
      const issueDate = format(new Date(), "yyyy-MM-dd");
      const dueDate = format(addDays(new Date(), user.defaultPaymentTermsDays), "yyyy-MM-dd");
      const [copy] = await tx
        .insert(invoices)
        .values({
          userId: user.id,
          clientId: source.clientId,
          projectId: source.projectId,
          sequence,
          number,
          status: "draft",
          currency: source.currency,
          issueDate,
          dueDate,
          subtotal: source.subtotal,
          taxRate: source.taxRate,
          taxAmount: source.taxAmount,
          discount: source.discount,
          total: source.total,
          amountPaid: "0.00",
          notes: source.notes,
          terms: source.terms,
        })
        .returning({ id: invoices.id, number: invoices.number });
      if (items.length) {
        await tx.insert(invoiceItems).values(
          items.map((item) => ({
            invoiceId: copy.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            position: item.position,
          })),
        );
      }
      await logActivity(tx, user.id, { action: "created", entityType: "invoice", entityId: copy.id, title: `Duplicated ${source.number} as ${copy.number}` });
      return copy;
    });
    revalidateApp("/invoices");
    return { ok: true, data: created, message: `Created draft ${created.number}` };
  } catch (error) {
    return failure(error, "Could not duplicate the invoice.");
  }
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const [deleted] = await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
      .returning({ number: invoices.number });
    if (!deleted) throw new KnownError("Invoice not found.");
    await logActivity(db, user.id, { action: "deleted", entityType: "invoice", title: `Deleted invoice ${deleted.number}` });
    revalidateApp("/invoices");
    return { ok: true, data: undefined, message: `Invoice ${deleted.number} deleted` };
  } catch (error) {
    return failure(error, "Could not delete the invoice.");
  }
}

export async function bulkDeleteInvoicesAction(ids: string[]): Promise<ActionResult<{ count: number }>> {
  const user = await requireUser();
  try {
    if (!ids.length) return { ok: true, data: { count: 0 } };
    const deleted = await db
      .delete(invoices)
      .where(and(eq(invoices.userId, user.id), inArray(invoices.id, ids)))
      .returning({ id: invoices.id });
    revalidateApp("/invoices");
    return { ok: true, data: { count: deleted.length }, message: `${deleted.length} invoice${deleted.length === 1 ? "" : "s"} deleted` };
  } catch (error) {
    return failure(error, "Could not delete the invoices.");
  }
}
