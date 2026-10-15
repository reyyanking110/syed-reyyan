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
import { createProjectAction, updateProjectAction } from "@/lib/actions/projects";
import { BILLING_TYPE, PRIORITY, PROJECT_COLORS, PROJECT_STATUS } from "@/lib/constants";
import type { Project } from "@/db/schema";
import { toDateInput } from "@/lib/dates";
import type { ClientOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { projectSchema, type ProjectInput } from "@/lib/validations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  clients: ClientOption[];
  defaultClientId?: string | null;
  defaultCurrency?: "USD" | "PKR";
  onCreated?: (id: string) => void;
};

export function ProjectFormDialog({ open, onOpenChange, project, clients, defaultClientId, defaultCurrency = "USD", onCreated }: Props) {
  const router = useRouter();
  const editing = !!project;
  const form = useForm<ProjectInput>({ resolver: zodResolver(projectSchema, undefined, { raw: true }), defaultValues: toDefaults(project, defaultClientId, defaultCurrency, clients) });
  const { register, handleSubmit, control, reset, setError, watch, setValue, formState } = form;
  const billingType = watch("billingType");
  const clientId = watch("clientId");

  React.useEffect(() => {
    if (open) reset(toDefaults(project, defaultClientId, defaultCurrency, clients));
  }, [open, project, defaultClientId, defaultCurrency, clients, reset]);

  // Follow the client's preferred currency when a client is picked on a new project.
  React.useEffect(() => {
    if (editing || !clientId) return;
    const client = clients.find((c) => c.id === clientId);
    if (client) setValue("currency", client.currency);
  }, [clientId, clients, editing, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const result = editing ? await updateProjectAction(project.id, values) : await createProjectAction(values);
    if (result.ok) {
      toast.success(result.message);
      onOpenChange(false);
      if (!editing) onCreated?.(result.data.id);
      router.refresh();
    } else {
      toast.error(result.error);
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(key as keyof ProjectInput, { message: messages[0] });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>{editing ? "Update scope, budget and timeline." : "Define the engagement so tasks and invoices have a home."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Project name" htmlFor="project-name" required error={formState.errors.name?.message} className="sm:col-span-2">
              <Input id="project-name" placeholder="Marketing website redesign" autoFocus aria-invalid={!!formState.errors.name} {...register("name")} />
            </Field>
            <Field label="Client" htmlFor="project-client" error={formState.errors.clientId?.message}>
              <NativeSelect id="project-client" {...register("clientId")}>
                <option value="">No client (internal)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company ?? client.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" htmlFor="project-status">
                <NativeSelect id="project-status" {...register("status")}>
                  {Object.entries(PROJECT_STATUS).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Priority" htmlFor="project-priority">
                <NativeSelect id="project-priority" {...register("priority")}>
                  {Object.entries(PRIORITY).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Billing" htmlFor="project-billing">
              <NativeSelect id="project-billing" {...register("billingType")}>
                {Object.entries(BILLING_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field label={billingType === "hourly" ? "Budget cap" : billingType === "retainer" ? "Monthly fee" : "Budget"} htmlFor="project-budget" error={formState.errors.budget?.message}>
                <Input id="project-budget" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" aria-invalid={!!formState.errors.budget} {...register("budget")} />
              </Field>
              <Field label="Currency" htmlFor="project-currency">
                <NativeSelect id="project-currency" {...register("currency")}>
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                </NativeSelect>
              </Field>
            </div>
            {billingType === "hourly" ? (
              <Field label="Hourly rate" htmlFor="project-rate" error={formState.errors.hourlyRate?.message}>
                <Input id="project-rate" type="number" inputMode="decimal" step="0.01" min="0" placeholder="50.00" {...register("hourlyRate")} />
              </Field>
            ) : (
              <div className="hidden sm:block" />
            )}
            <Field label="Start date" htmlFor="project-start" error={formState.errors.startDate?.message}>
              <Input id="project-start" type="date" {...register("startDate")} />
            </Field>
            <Field label="Due date" htmlFor="project-due" error={formState.errors.dueDate?.message}>
              <Input id="project-due" type="date" aria-invalid={!!formState.errors.dueDate} {...register("dueDate")} />
            </Field>
            <Field label="Colour" className="sm:col-span-2">
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((color) => (
                      <button key={color} type="button" onClick={() => field.onChange(color)} className={cn("size-7 rounded-full ring-2 ring-offset-2 ring-offset-card transition", field.value === color ? "ring-foreground" : "ring-transparent hover:scale-110")} style={{ background: color }} aria-label={`Pick colour ${color}`} aria-pressed={field.value === color} />
                    ))}
                  </div>
                )}
              />
            </Field>
            <Field label="Tags" className="sm:col-span-2">
              <Controller control={control} name="tags" render={({ field }) => <TagsInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="nextjs, branding, urgent…" />} />
            </Field>
            <Field label="Description" htmlFor="project-description" className="sm:col-span-2" error={formState.errors.description?.message}>
              <Textarea id="project-description" rows={3} placeholder="Scope, deliverables, context…" {...register("description")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(project: Project | null | undefined, defaultClientId: string | null | undefined, currency: "USD" | "PKR", clients: ClientOption[]): ProjectInput {
  const client = clients.find((c) => c.id === (project?.clientId ?? defaultClientId));
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    clientId: project?.clientId ?? defaultClientId ?? "",
    status: project?.status ?? "planning",
    priority: project?.priority ?? "medium",
    billingType: project?.billingType ?? "fixed",
    budget: project?.budget ?? "",
    hourlyRate: project?.hourlyRate ?? "",
    currency: project?.currency ?? client?.currency ?? currency,
    startDate: toDateInput(project?.startDate),
    dueDate: toDateInput(project?.dueDate),
    color: project?.color ?? PROJECT_COLORS[0],
    tags: project?.tags ?? [],
  };
}
