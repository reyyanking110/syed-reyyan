"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { recordPaymentAction } from "@/lib/actions/invoices";
import { PAYMENT_METHOD } from "@/lib/constants";
import type { Currency, InvoiceStatus } from "@/db/schema";
import { toDateInput } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toNumber } from "@/lib/utils";
import { paymentSchema, type PaymentInput } from "@/lib/validations";

type InvoiceLike = { id: string; number: string; currency: Currency; total: string; amountPaid: string; status: InvoiceStatus };

export function RecordPaymentDialog({ open, onOpenChange, invoice }: { open: boolean; onOpenChange: (open: boolean) => void; invoice: InvoiceLike | null }) {
  const router = useRouter();
  const balance = invoice ? Math.max(0, toNumber(invoice.total) - toNumber(invoice.amountPaid)) : 0;
  const { register, handleSubmit, reset, setError, setValue, watch, formState } = useForm<PaymentInput>({ resolver: zodResolver(paymentSchema, undefined, { raw: true }), defaultValues: defaults(balance) });
  const amount = toNumber(watch("amount") as string | number | undefined);

  React.useEffect(() => {
    if (open) reset(defaults(balance));
  }, [open, balance, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!invoice) return;
    const result = await recordPaymentAction({ ...values, invoiceId: invoice.id, currency: invoice.currency });
    if (result.ok) {
      toast.success(result.message);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(key as keyof PaymentInput, { message: messages[0] });
      }
    }
  });

  if (!invoice) return null;
  const remaining = Math.max(0, balance - amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice.number} · balance {formatMoney(balance, invoice.currency)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field label={`Amount (${invoice.currency})`} htmlFor="payment-amount" required error={formState.errors.amount?.message}>
              <Input id="payment-amount" type="number" step="0.01" min="0.01" inputMode="decimal" autoFocus aria-invalid={!!formState.errors.amount} {...register("amount")} />
              {balance > 0 ? (
                <div className="mt-1.5 flex gap-1.5">
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setValue("amount", balance.toFixed(2), { shouldValidate: true })}>
                    Full balance
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setValue("amount", (balance / 2).toFixed(2), { shouldValidate: true })}>
                    50%
                  </button>
                </div>
              ) : null}
            </Field>
            <Field label="Date received" htmlFor="payment-date" required error={formState.errors.paidAt?.message}>
              <Input id="payment-date" type="date" {...register("paidAt")} />
            </Field>
            <Field label="Method" htmlFor="payment-method">
              <NativeSelect id="payment-method" {...register("method")}>
                {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Reference" htmlFor="payment-reference" error={formState.errors.reference?.message}>
              <Input id="payment-reference" placeholder="Transaction ID" {...register("reference")} />
            </Field>
            <Field label="Notes" htmlFor="payment-notes" className="sm:col-span-2" error={formState.errors.notes?.message}>
              <Textarea id="payment-notes" rows={2} placeholder="Optional" {...register("notes")} />
            </Field>
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
              {amount > 0 && amount >= balance - 0.004 ? "This payment settles the invoice in full — it will be marked as paid." : amount > 0 ? `${formatMoney(remaining, invoice.currency)} will remain outstanding (partially paid).` : "Enter the amount received."}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaults(balance: number): PaymentInput {
  return { amount: balance > 0 ? balance.toFixed(2) : "", paidAt: toDateInput(new Date()), method: "bank_transfer", reference: "", notes: "" };
}
