"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { TagsInput } from "@/components/shared/client-utils";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import { CLIENT_STATUS, COUNTRIES } from "@/lib/constants";
import type { Client } from "@/db/schema";
import { clientSchema, type ClientInput } from "@/lib/validations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  defaultCurrency?: "USD" | "PKR";
  onCreated?: (id: string) => void;
};

export function ClientFormDialog({ open, onOpenChange, client, defaultCurrency = "USD", onCreated }: Props) {
  const router = useRouter();
  const editing = !!client;
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema, undefined, { raw: true }),
    defaultValues: toDefaults(client, defaultCurrency),
  });
  const { register, handleSubmit, control, reset, setError, formState } = form;

  React.useEffect(() => {
    if (open) reset(toDefaults(client, defaultCurrency));
  }, [open, client, defaultCurrency, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = editing ? await updateClientAction(client.id, values) : await createClientAction(values);
    if (result.ok) {
      toast.success(result.message);
      onOpenChange(false);
      if (!editing) onCreated?.(result.data.id);
      router.refresh();
    } else {
      toast.error(result.error);
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(key as keyof ClientInput, { message: messages[0] });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>{editing ? "Update contact details and preferences." : "Add a person or company you work with."}</DialogDescription>
        </DialogHeader>
        <form id="client-form" onSubmit={onSubmit} noValidate>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name" htmlFor="client-name" required error={formState.errors.name?.message}>
              <Input id="client-name" placeholder="Sarah Mitchell" autoFocus aria-invalid={!!formState.errors.name} {...register("name")} />
            </Field>
            <Field label="Company" htmlFor="client-company" error={formState.errors.company?.message}>
              <Input id="client-company" placeholder="Lumen Health" {...register("company")} />
            </Field>
            <Field label="Email" htmlFor="client-email" error={formState.errors.email?.message}>
              <Input id="client-email" type="email" placeholder="sarah@company.com" aria-invalid={!!formState.errors.email} {...register("email")} />
            </Field>
            <Field label="Phone" htmlFor="client-phone" error={formState.errors.phone?.message}>
              <Input id="client-phone" placeholder="+92 300 1234567" {...register("phone")} />
            </Field>
            <Field label="Website" htmlFor="client-website" error={formState.errors.website?.message}>
              <Input id="client-website" placeholder="company.com" aria-invalid={!!formState.errors.website} {...register("website")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" htmlFor="client-status">
                <NativeSelect id="client-status" {...register("status")}>
                  {Object.entries(CLIENT_STATUS).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Currency" htmlFor="client-currency" hint="Default for invoices">
                <NativeSelect id="client-currency" {...register("currency")}>
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (Rs)</option>
                </NativeSelect>
              </Field>
            </div>
            <Field label="Country" htmlFor="client-country">
              <Input id="client-country" list="country-list" placeholder="Pakistan" {...register("country")} />
              <datalist id="country-list">
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="City" htmlFor="client-city">
              <Input id="client-city" placeholder="Karachi" {...register("city")} />
            </Field>
            <Field label="Address" htmlFor="client-address" className="sm:col-span-2">
              <Input id="client-address" placeholder="Street, area, postal code" {...register("address")} />
            </Field>
            <Field label="Tags" className="sm:col-span-2" hint="Press Enter to add. Up to 12 tags.">
              <Controller control={control} name="tags" render={({ field }) => <TagsInput value={(field.value as string[]) ?? []} onChange={field.onChange} />} />
            </Field>
            <Field label="Notes" htmlFor="client-notes" className="sm:col-span-2" error={formState.errors.notes?.message}>
              <Textarea id="client-notes" placeholder="Preferences, payment habits, context…" rows={3} {...register("notes")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {editing ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(client: Client | null | undefined, currency: "USD" | "PKR"): ClientInput {
  return {
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    country: client?.country ?? "",
    city: client?.city ?? "",
    address: client?.address ?? "",
    notes: client?.notes ?? "",
    status: client?.status ?? "active",
    currency: client?.currency ?? currency,
    tags: client?.tags ?? [],
  };
}
