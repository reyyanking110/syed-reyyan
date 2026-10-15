"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Copy, Eye, MoreHorizontal, Pencil, Plus, Receipt, Send, Trash2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { ClearFilters, ConfirmDialog, FilterChips, FilterSelect, SearchInput, useAction } from "@/components/shared/client-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Avatar, Card, EmptyState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { deleteInvoiceAction, duplicateInvoiceAction, updateInvoiceStatusAction } from "@/lib/actions/invoices";
import type { Currency } from "@/db/schema";
import { dueLabel, formatDate } from "@/lib/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import type { ClientOption, InvoiceListItem } from "@/lib/types";

type InvoiceSummary = { outstanding: number; overdue: number; overdueCount: number; paidTotal: number; draftCount: number; openCount: number };
import { cn, toNumber } from "@/lib/utils";

export function InvoicesView({ invoices, clients, summary, baseCurrency, hasFilters }: { invoices: InvoiceListItem[]; clients: ClientOption[]; summary: InvoiceSummary; baseCurrency: Currency; hasFilters: boolean }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [deleting, setDeleting] = React.useState<InvoiceListItem | null>(null);
  const [paying, setPaying] = React.useState<InvoiceListItem | null>(null);
  const [, startTransition] = React.useTransition();
  const [optimistic, applyOptimistic] = React.useOptimistic(invoices, (state, update: { id: string; remove?: boolean; status?: InvoiceListItem["status"] }) =>
    update.remove ? state.filter((i) => i.id !== update.id) : state.map((i) => (i.id === update.id ? { ...i, status: update.status ?? i.status } : i)),
  );

  const markSent = (invoice: InvoiceListItem) =>
    startTransition(async () => {
      applyOptimistic({ id: invoice.id, status: "sent" });
      const result = await updateInvoiceStatusAction(invoice.id, "send");
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });

  const duplicate = (invoice: InvoiceListItem) =>
    run(duplicateInvoiceAction(invoice.id), { onSuccess: (data) => router.push(`/invoices/${data.id}/edit`) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description={`${formatMoneyCompact(summary.paidTotal, baseCurrency)} collected · ${formatMoneyCompact(summary.outstanding, baseCurrency)} outstanding`}
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        }
      />

      <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard icon={<Wallet className="size-4" />} label="Outstanding" value={formatMoneyCompact(summary.outstanding, baseCurrency)} hint={`${summary.openCount} open invoice${summary.openCount === 1 ? "" : "s"}`} tone="indigo" />
        <SummaryCard icon={<AlertTriangle className="size-4" />} label="Overdue" value={formatMoneyCompact(summary.overdue, baseCurrency)} hint={`${summary.overdueCount} past due`} tone={summary.overdueCount ? "rose" : "muted"} />
        <SummaryCard icon={<Clock className="size-4" />} label="Drafts" value={String(summary.draftCount)} hint="Not yet sent" tone="amber" />
        <SummaryCard icon={<Receipt className="size-4" />} label="Collected" value={formatMoneyCompact(summary.paidTotal, baseCurrency)} hint="All payments received" tone="emerald" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips param="status" options={[{ value: "all", label: "All" }, { value: "open", label: "Open", count: summary.openCount }, { value: "draft", label: "Draft", count: summary.draftCount }, { value: "overdue", label: "Overdue", count: summary.overdueCount }, { value: "paid", label: "Paid" }]} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search number or client…" className="w-full sm:w-60" />
          <FilterSelect param="client" label="Client" options={[{ value: "all", label: "All clients" }, ...clients.map((c) => ({ value: c.id, label: c.company ?? c.name }))]} />
          <FilterSelect param="sort" label="Sort" defaultValue="recent" options={[{ value: "recent", label: "Newest" }, { value: "due", label: "Due date" }, { value: "amount", label: "Amount" }]} />
          <ClearFilters keys={["q", "status", "client", "sort"]} />
        </div>
      </div>

      {optimistic.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title={hasFilters ? "No invoices match" : "No invoices yet"}
          description={hasFilters ? "Try another filter." : "Create a professional invoice in PKR or USD and get paid faster."}
          action={
            hasFilters ? (
              <ClearFilters keys={["q", "status", "client", "sort"]} />
            ) : (
              <Button asChild>
                <Link href="/invoices/new">
                  <Plus /> Create invoice
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimistic.map((invoice) => {
                  const balance = Math.max(0, toNumber(invoice.total) - toNumber(invoice.amountPaid));
                  const due = dueLabel(invoice.dueDate);
                  const open = !["paid", "cancelled", "draft"].includes(invoice.status);
                  return (
                    <TableRow key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                      <TableCell>
                        <p className="font-medium">{invoice.number}</p>
                        {invoice.project ? <p className="truncate text-xs text-muted-foreground">{invoice.project.name}</p> : null}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar name={invoice.client.company ?? invoice.client.name} color={invoice.client.color} size="sm" />
                          <span className="truncate">{invoice.client.company ?? invoice.client.name}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge kind="invoice" status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell className={cn(open && due.tone === "danger" ? "font-medium text-rose-600" : open && due.tone === "warning" ? "font-medium text-amber-600" : "text-muted-foreground")}>{invoice.status === "paid" ? `Paid ${formatDate(invoice.paidAt)}` : open ? due.label : formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium tabular">{formatMoney(invoice.total, invoice.currency)}</TableCell>
                      <TableCell className={cn("text-right tabular", balance > 0 ? "font-medium" : "text-muted-foreground")}>{formatMoney(balance, invoice.currency)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <InvoiceMenu invoice={invoice} onPay={() => setPaying(invoice)} onSend={() => markSent(invoice)} onDuplicate={() => duplicate(invoice)} onDelete={() => setDeleting(invoice)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <ul className="stagger grid gap-3 md:hidden">
            {optimistic.map((invoice) => {
              const balance = Math.max(0, toNumber(invoice.total) - toNumber(invoice.amountPaid));
              return (
                <li key={invoice.id}>
                  <Card className="gap-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/invoices/${invoice.id}`} className="min-w-0">
                        <p className="font-semibold">{invoice.number}</p>
                        <p className="truncate text-sm text-muted-foreground">{invoice.client.company ?? invoice.client.name}</p>
                      </Link>
                      <InvoiceMenu invoice={invoice} onPay={() => setPaying(invoice)} onSend={() => markSent(invoice)} onDuplicate={() => duplicate(invoice)} onDelete={() => setDeleting(invoice)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <StatusBadge kind="invoice" status={invoice.status} />
                      <div className="text-right">
                        <p className="font-semibold tabular">{formatMoney(invoice.total, invoice.currency)}</p>
                        {balance > 0 && balance !== toNumber(invoice.total) ? <p className="text-xs text-muted-foreground">{formatMoney(balance, invoice.currency)} due</p> : null}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}</p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <RecordPaymentDialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)} invoice={paying} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.number}?`}
        description="The invoice and any recorded payments on it will be removed. This cannot be undone."
        confirmLabel="Delete invoice"
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          const target = deleting;
          await run(deleteInvoiceAction(target.id), { onSuccess: () => { setDeleting(null); startTransition(() => applyOptimistic({ id: target.id, remove: true })); } });
        }}
      />
    </div>
  );
}

function InvoiceMenu({ invoice, onPay, onSend, onDuplicate, onDelete }: { invoice: InvoiceListItem; onPay: () => void; onSend: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const payable = !["paid", "cancelled"].includes(invoice.status);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Invoice actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/invoices/${invoice.id}`}>
            <Eye /> View
          </Link>
        </DropdownMenuItem>
        {invoice.status !== "paid" ? (
          <DropdownMenuItem asChild>
            <Link href={`/invoices/${invoice.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </DropdownMenuItem>
        ) : null}
        {invoice.status === "draft" ? (
          <DropdownMenuItem onSelect={onSend}>
            <Send /> Mark as sent
          </DropdownMenuItem>
        ) : null}
        {payable ? (
          <DropdownMenuItem onSelect={onPay}>
            <Wallet /> Record payment
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SummaryCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: "indigo" | "rose" | "amber" | "emerald" | "muted" }) {
  const tones = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="flex-row items-center gap-3 px-4 py-3.5">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold tabular">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </Card>
  );
}
