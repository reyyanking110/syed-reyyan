"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Check, Copy, MoreHorizontal, Pencil, Printer, Send, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { ConfirmDialog, useAction } from "@/components/shared/client-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Avatar, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/primitives";
import { deletePaymentAction, deleteInvoiceAction, duplicateInvoiceAction, updateInvoiceStatusAction } from "@/lib/actions/invoices";
import { APP_NAME, PAYMENT_METHOD } from "@/lib/constants";
import type { User } from "@/db/schema";
import { dueLabel, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { InvoiceDetail } from "@/lib/types";
import { cn, toNumber } from "@/lib/utils";

type Props = { invoice: InvoiceDetail; user: Pick<User, "name" | "businessName" | "businessAddress" | "email" | "website" | "taxId" | "location"> };

export function InvoiceDetailView({ invoice, user }: Props) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [payOpen, setPayOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingPayment, setDeletingPayment] = React.useState<string | null>(null);
  const [status, setStatus] = React.useOptimistic(invoice.status);
  const [, startTransition] = React.useTransition();

  const total = toNumber(invoice.total);
  const paid = toNumber(invoice.amountPaid);
  const balance = Math.max(0, total - paid);
  const payable = !["paid", "cancelled"].includes(status);
  const due = dueLabel(invoice.dueDate);

  const markSent = () =>
    startTransition(async () => {
      setStatus("sent");
      const result = await updateInvoiceStatusAction(invoice.id, "send");
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });
  const setCancelled = () =>
    startTransition(async () => {
      setStatus("cancelled");
      const result = await updateInvoiceStatusAction(invoice.id, "cancel");
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });
  const reopen = () =>
    startTransition(async () => {
      setStatus("sent");
      const result = await updateInvoiceStatusAction(invoice.id, "reopen");
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Invoices
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.number}</h1>
            <StatusBadge kind="invoice" status={status} />
            {payable && status !== "draft" ? <span className={cn("text-sm", due.tone === "danger" ? "font-medium text-rose-600" : due.tone === "warning" ? "font-medium text-amber-600" : "text-muted-foreground")}>{due.label}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Print / PDF
          </Button>
          {status === "draft" ? (
            <Button variant="outline" onClick={markSent}>
              <Send /> Mark as sent
            </Button>
          ) : null}
          {payable ? (
            <Button onClick={() => setPayOpen(true)}>
              <Wallet /> Record payment
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {status !== "paid" ? (
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/${invoice.id}/edit`}>
                    <Pencil /> Edit
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => run(duplicateInvoiceAction(invoice.id), { onSuccess: (data) => router.push(`/invoices/${data.id}/edit`) })}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              {status === "cancelled" ? (
                <DropdownMenuItem onSelect={reopen}>
                  <Check /> Reopen
                </DropdownMenuItem>
              ) : status !== "paid" ? (
                <DropdownMenuItem onSelect={setCancelled}>
                  <Ban /> Cancel invoice
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] print:block">
        {/* Printable document */}
        <Card className="print-sheet gap-0 p-0 print:border-0 print:shadow-none">
          <div className="flex flex-col gap-6 border-b p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Invoice</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{invoice.number}</p>
              <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                <p>
                  <span className="inline-block w-20 text-xs uppercase tracking-wide">Issued</span> {formatDate(invoice.issueDate)}
                </p>
                <p>
                  <span className="inline-block w-20 text-xs uppercase tracking-wide">Due</span> {formatDate(invoice.dueDate)}
                </p>
                {invoice.paidAt ? (
                  <p>
                    <span className="inline-block w-20 text-xs uppercase tracking-wide">Paid</span> {formatDate(invoice.paidAt)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-lg font-semibold">{user.businessName || user.name}</p>
              {user.businessName ? <p className="text-sm text-muted-foreground">{user.name}</p> : null}
              {user.businessAddress ? <p className="whitespace-pre-line text-sm text-muted-foreground">{user.businessAddress}</p> : user.location ? <p className="text-sm text-muted-foreground">{user.location}</p> : null}
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.website ? <p className="text-sm text-muted-foreground">{user.website.replace(/^https?:\/\//, "")}</p> : null}
              {user.taxId ? <p className="text-xs text-muted-foreground">Tax ID: {user.taxId}</p> : null}
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bill to</p>
              <div className="mt-2 flex items-start gap-3">
                <Avatar name={invoice.client.company ?? invoice.client.name} color={invoice.client.color} size="md" className="print:hidden" />
                <div className="text-sm">
                  <Link href={`/clients/${invoice.client.id}`} className="font-semibold hover:underline print:no-underline">
                    {invoice.client.company ?? invoice.client.name}
                  </Link>
                  {invoice.client.company ? <p className="text-muted-foreground">{invoice.client.name}</p> : null}
                  {invoice.client.email ? <p className="text-muted-foreground">{invoice.client.email}</p> : null}
                  {invoice.client.address ? <p className="whitespace-pre-line text-muted-foreground">{invoice.client.address}</p> : null}
                  {[invoice.client.city, invoice.client.country].filter(Boolean).length ? <p className="text-muted-foreground">{[invoice.client.city, invoice.client.country].filter(Boolean).join(", ")}</p> : null}
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{status === "paid" ? "Amount paid" : "Amount due"}</p>
              <p className={cn("mt-1 text-3xl font-bold tracking-tight tabular", status === "paid" ? "text-emerald-600" : "")}>{formatMoney(status === "paid" ? total : balance, invoice.currency)}</p>
              {invoice.project ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Project:{" "}
                  <Link href={`/projects/${invoice.project.id}`} className="hover:underline">
                    {invoice.project.name}
                  </Link>
                </p>
              ) : null}
            </div>
          </div>

          <div className="px-6 sm:px-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2.5 font-medium">Description</th>
                  <th className="py-2.5 text-right font-medium">Qty</th>
                  <th className="py-2.5 text-right font-medium">Unit price</th>
                  <th className="py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{item.description}</td>
                    <td className="py-3 text-right tabular text-muted-foreground">{toNumber(item.quantity)}</td>
                    <td className="py-3 text-right tabular text-muted-foreground">{formatMoney(item.unitPrice, invoice.currency)}</td>
                    <td className="py-3 text-right font-medium tabular">{formatMoney(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:justify-between sm:p-8">
            <div className="max-w-sm space-y-4 text-sm">
              {invoice.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">{invoice.notes}</p>
                </div>
              ) : null}
              {invoice.terms ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment terms</p>
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">{invoice.terms}</p>
                </div>
              ) : null}
            </div>
            <dl className="w-full space-y-2 text-sm sm:w-64">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular">{formatMoney(invoice.subtotal, invoice.currency)}</dd>
              </div>
              {toNumber(invoice.taxRate) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax ({toNumber(invoice.taxRate)}%)</dt>
                  <dd className="tabular">{formatMoney(invoice.taxAmount, invoice.currency)}</dd>
                </div>
              ) : null}
              {toNumber(invoice.discount) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular">−{formatMoney(invoice.discount, invoice.currency)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular">{formatMoney(invoice.total, invoice.currency)}</dd>
              </div>
              {paid > 0 ? (
                <>
                  <div className="flex justify-between text-emerald-600">
                    <dt>Paid</dt>
                    <dd className="tabular">−{formatMoney(paid, invoice.currency)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <dt>Balance due</dt>
                    <dd className="tabular">{formatMoney(balance, invoice.currency)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>
          <p className="border-t px-6 py-3 text-center text-[11px] text-muted-foreground sm:px-8">
            Generated with {APP_NAME}
          </p>
        </Card>

        {/* Side panel */}
        <div className="space-y-6 print:hidden">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Payments</CardTitle>
              {payable ? (
                <Button variant="ghost" size="sm" onClick={() => setPayOpen(true)}>
                  <Wallet /> Add
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <EmptyState compact icon={<Wallet />} title="No payments yet" description={status === "draft" ? "Send the invoice first, then log payments here." : "Log payments as they arrive to track your balance."} />
              ) : (
                <ul className="divide-y">
                  {invoice.payments.map((payment) => (
                    <li key={payment.id} className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Check className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium tabular">{formatMoney(payment.amount, payment.currency)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(payment.paidAt)} · {PAYMENT_METHOD[payment.method]}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon-xs" className="text-muted-foreground opacity-0 transition group-hover:opacity-100 focus:opacity-100" aria-label="Delete payment" onClick={() => setDeletingPayment(payment.id)}>
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="tabular">{formatMoney(paid, invoice.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance</span>
                  <span className="tabular">{formatMoney(balance, invoice.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-4 text-sm">
                <TimelineItem label="Created" date={invoice.createdAt} />
                {invoice.sentAt ? <TimelineItem label="Sent to client" date={invoice.sentAt} /> : null}
                {invoice.payments.map((payment) => (
                  <TimelineItem key={payment.id} label={`Payment of ${formatMoney(payment.amount, payment.currency)}`} date={payment.paidAt} />
                ))}
                {invoice.paidAt ? <TimelineItem label="Paid in full" date={invoice.paidAt} accent /> : null}
                {status === "overdue" ? <TimelineItem label="Overdue" date={invoice.dueDate} danger /> : null}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} invoice={invoice} />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={`Delete ${invoice.number}?`} description="The invoice and its payments will be permanently removed." confirmLabel="Delete invoice" pending={pending} onConfirm={() => run(deleteInvoiceAction(invoice.id), { onSuccess: () => router.push("/invoices") })} />
      <ConfirmDialog
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
        title="Remove this payment?"
        description="The invoice balance will be recalculated."
        confirmLabel="Remove payment"
        pending={pending}
        onConfirm={async () => {
          if (!deletingPayment) return;
          await run(deletePaymentAction(deletingPayment), { onSuccess: () => { setDeletingPayment(null); router.refresh(); } });
        }}
      />
    </div>
  );
}

function TimelineItem({ label, date, accent, danger }: { label: string; date: Date | string | null; accent?: boolean; danger?: boolean }) {
  return (
    <li className="relative">
      <span className={cn("absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full ring-4 ring-card", accent ? "bg-emerald-500" : danger ? "bg-rose-500" : "bg-muted-foreground/40")} />
      <p className="font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
    </li>
  );
}
