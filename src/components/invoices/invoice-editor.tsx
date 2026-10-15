"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { createInvoiceAction, updateInvoiceAction } from "@/lib/actions/invoices";
import type { Currency, Invoice, InvoiceItem } from "@/db/schema";
import { addDaysInput, toDateInput } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ClientOption, ProjectOption } from "@/lib/types";
import { cn, toNumber } from "@/lib/utils";
import { invoiceSchema, type InvoiceInput } from "@/lib/validations";

type Props = {
  invoice?: (Invoice & { items: InvoiceItem[] }) | null;
  clients: ClientOption[];
  projects: ProjectOption[];
  defaults: { clientId?: string; projectId?: string; currency: Currency; taxRate: string; paymentTermsDays: number; notes: string; terms: string; nextNumber: string };
};

export function InvoiceEditor({ invoice, clients, projects, defaults }: Props) {
  const router = useRouter();
  const editing = !!invoice;
  const form = useForm<InvoiceInput>({ resolver: zodResolver(invoiceSchema, undefined, { raw: true }), defaultValues: toDefaults(invoice, defaults, clients) });
  const { register, control, handleSubmit, watch, setValue, setError, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const values = watch();
  const totals = computeTotals(values.items ?? [], values.taxRate, values.discount);
  const currency = values.currency;
  const clientProjects = projects.filter((p) => !values.clientId || p.clientId === values.clientId || !p.clientId);
  const [submitAs, setSubmitAs] = React.useState<"draft" | "sent">(invoice?.status && invoice.status !== "draft" ? "sent" : "draft");

  // Adopt the client's currency when switching client on a new invoice.
  const clientId = values.clientId;
  React.useEffect(() => {
    if (editing || !clientId) return;
    const client = clients.find((c) => c.id === clientId);
    if (client) setValue("currency", client.currency);
  }, [clientId, clients, editing, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    const payload = { ...data, status: submitAs };
    const result = editing ? await updateInvoiceAction(invoice.id, payload) : await createInvoiceAction(payload);
    if (result.ok) {
      toast.success(result.message);
      router.push(`/invoices/${editing ? invoice.id : result.data.id}`);
      router.refresh();
    } else {
      toast.error(result.error);
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(key as keyof InvoiceInput, { message: messages[0] });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={editing ? `/invoices/${invoice.id}` : "/invoices"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {editing ? invoice.number : "Invoices"}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{editing ? `Edit ${invoice.number}` : `New invoice ${defaults.nextNumber}`}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          {!editing || invoice.status === "draft" ? (
            <Button type="submit" variant="outline" loading={formState.isSubmitting && submitAs === "draft"} onClick={() => setSubmitAs("draft")}>
              Save draft
            </Button>
          ) : null}
          <Button type="submit" loading={formState.isSubmitting && submitAs === "sent"} onClick={() => setSubmitAs("sent")}>
            {editing && invoice.status !== "draft" ? "Save changes" : "Save & mark sent"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bill to</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Client" htmlFor="invoice-client" required error={formState.errors.clientId?.message}>
                <NativeSelect id="invoice-client" aria-invalid={!!formState.errors.clientId} {...register("clientId")}>
                  <option value="">Select a client…</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company ? `${client.company} (${client.name})` : client.name}
                    </option>
                  ))}
                </NativeSelect>
                {clients.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No clients yet —{" "}
                    <Link href="/clients?new=1" className="text-primary hover:underline">
                      add one first
                    </Link>
                    .
                  </p>
                ) : null}
              </Field>
              <Field label="Project" htmlFor="invoice-project">
                <NativeSelect id="invoice-project" {...register("projectId")}>
                  <option value="">No project</option>
                  {clientProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Issue date" htmlFor="invoice-issue" required error={formState.errors.issueDate?.message}>
                <Input id="invoice-issue" type="date" {...register("issueDate")} />
              </Field>
              <Field label="Due date" htmlFor="invoice-due" required error={formState.errors.dueDate?.message}>
                <Input id="invoice-due" type="date" aria-invalid={!!formState.errors.dueDate} {...register("dueDate")} />
                <div className="mt-1.5 flex gap-2 text-xs">
                  {[7, 14, 30].map((days) => (
                    <button key={days} type="button" className="text-primary hover:underline" onClick={() => setValue("dueDate", addDaysInput(values.issueDate, days), { shouldValidate: true })}>
                      Net {days}
                    </button>
                  ))}
                </div>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Line items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: "1", unitPrice: "" })}>
                <Plus /> Add item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="hidden grid-cols-[1.25rem_1fr_6rem_8rem_7rem_2rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                <span />
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {fields.map((field, index) => {
                const item = values.items?.[index];
                const amount = toNumber(item?.quantity as string | number | undefined) * toNumber(item?.unitPrice as string | number | undefined);
                const errors = formState.errors.items?.[index];
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border p-3 sm:grid-cols-[1.25rem_1fr_6rem_8rem_7rem_2rem] sm:items-start sm:border-0 sm:p-0">
                    <GripVertical className="mt-2.5 hidden size-4 text-muted-foreground/50 sm:block" />
                    <div className="col-span-2 sm:col-span-1">
                      <Input placeholder={`Item ${index + 1} — e.g. Homepage design`} aria-label="Description" aria-invalid={!!errors?.description} {...register(`items.${index}.description` as const)} />
                      {errors?.description ? <p className="mt-1 text-xs text-destructive">{errors.description.message}</p> : null}
                    </div>
                    <div className="flex items-center gap-2 sm:contents">
                      <Input type="number" step="0.01" min="0" className="w-24 text-right sm:w-auto" aria-label="Quantity" aria-invalid={!!errors?.quantity} {...register(`items.${index}.quantity` as const)} />
                      <Input type="number" step="0.01" min="0" placeholder="0.00" className="w-32 text-right sm:w-auto" aria-label="Unit price" aria-invalid={!!errors?.unitPrice} {...register(`items.${index}.unitPrice` as const)} />
                      <span className="flex-1 text-right text-sm font-medium tabular sm:h-9 sm:flex-none sm:leading-9">{formatMoney(amount, currency)}</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" className="justify-self-end text-muted-foreground hover:text-destructive" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="Remove item">
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
              {typeof formState.errors.items?.message === "string" ? <p className="text-xs text-destructive">{formState.errors.items.message}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes & terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Notes to client" htmlFor="invoice-notes" error={formState.errors.notes?.message}>
                <Textarea id="invoice-notes" rows={4} placeholder="Thank you for your business!" {...register("notes")} />
              </Field>
              <Field label="Payment terms / instructions" htmlFor="invoice-terms" error={formState.errors.terms?.message}>
                <Textarea id="invoice-terms" rows={4} placeholder="Bank details, PayPal address, late fees…" {...register("terms")} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency" htmlFor="invoice-currency">
                  <NativeSelect id="invoice-currency" {...register("currency")}>
                    <option value="USD">USD $</option>
                    <option value="PKR">PKR ₨</option>
                  </NativeSelect>
                </Field>
                <Field label="Tax %" htmlFor="invoice-tax" error={formState.errors.taxRate?.message}>
                  <Input id="invoice-tax" type="number" step="0.01" min="0" max="100" {...register("taxRate")} />
                </Field>
              </div>
              <Field label={`Discount (${currency})`} htmlFor="invoice-discount" error={formState.errors.discount?.message}>
                <Input id="invoice-discount" type="number" step="0.01" min="0" placeholder="0.00" {...register("discount")} />
              </Field>
              <dl className="space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular">{formatMoney(totals.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax ({toNumber(values.taxRate as string | number | undefined)}%)</dt>
                  <dd className="tabular">{formatMoney(totals.taxAmount, currency)}</dd>
                </div>
                {totals.discount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular text-emerald-600">−{formatMoney(totals.discount, currency)}</dd>
                  </div>
                ) : null}
                <div className={cn("flex items-baseline justify-between border-t pt-3 text-base font-semibold")}>
                  <dt>Total</dt>
                  <dd className="text-xl tabular">{formatMoney(totals.total, currency)}</dd>
                </div>
                {editing && toNumber(invoice.amountPaid) > 0 ? (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <dt>Already paid</dt>
                    <dd className="tabular">{formatMoney(invoice.amountPaid, currency)}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Invoice numbers are assigned automatically ({defaults.nextNumber} next). Totals are stored in the invoice currency and converted to your base currency for reports using the rate in Settings.
          </p>
        </div>
      </div>
    </form>
  );
}

function toDefaults(invoice: Props["invoice"], defaults: Props["defaults"], clients: ClientOption[]): InvoiceInput {
  if (invoice) {
    return {
      clientId: invoice.clientId,
      projectId: invoice.projectId ?? "",
      status: invoice.status === "draft" ? "draft" : "sent",
      currency: invoice.currency,
      issueDate: toDateInput(invoice.issueDate),
      dueDate: toDateInput(invoice.dueDate),
      taxRate: invoice.taxRate,
      discount: invoice.discount,
      notes: invoice.notes ?? "",
      terms: invoice.terms ?? "",
      items: invoice.items.map((item) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice })),
    };
  }
  const client = clients.find((c) => c.id === defaults.clientId);
  const issueDate = toDateInput(new Date());
  return {
    clientId: defaults.clientId ?? "",
    projectId: defaults.projectId ?? "",
    status: "draft",
    currency: client?.currency ?? defaults.currency,
    issueDate,
    dueDate: addDaysInput(issueDate, defaults.paymentTermsDays),
    taxRate: defaults.taxRate,
    discount: "0",
    notes: defaults.notes,
    terms: defaults.terms,
    items: [{ description: "", quantity: "1", unitPrice: "" }],
  };
}

function computeTotals(items: { quantity?: unknown; unitPrice?: unknown }[], taxRate: unknown, discount: unknown) {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.quantity as string | number | undefined) * toNumber(item.unitPrice as string | number | undefined), 0);
  const taxAmount = (subtotal * toNumber(taxRate as string | number | undefined)) / 100;
  const discountValue = Math.min(toNumber(discount as string | number | undefined), subtotal + taxAmount);
  const total = Math.max(0, subtotal + taxAmount - discountValue);
  const round = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: round(subtotal), taxAmount: round(taxAmount), discount: round(discountValue), total: round(total) };
}
