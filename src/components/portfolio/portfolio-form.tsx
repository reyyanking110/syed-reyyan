"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Switch } from "@/components/ui/overlays";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { TagsInput } from "@/components/shared/client-utils";
import { createPortfolioItemAction, updatePortfolioItemAction } from "@/lib/actions/portfolio";
import { GRADIENTS, PORTFOLIO_CATEGORIES } from "@/lib/constants";
import type { PortfolioItem } from "@/db/schema";
import { toDateInput } from "@/lib/dates";
import type { ClientOption, ProjectOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { portfolioSchema, type PortfolioInput } from "@/lib/validations";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; item?: PortfolioItem | null; clients: ClientOption[]; projects: ProjectOption[] };

export function PortfolioFormDialog({ open, onOpenChange, item, clients, projects }: Props) {
  const router = useRouter();
  const editing = !!item;
  const { register, control, handleSubmit, reset, setError, watch, formState } = useForm<PortfolioInput>({ resolver: zodResolver(portfolioSchema, undefined, { raw: true }), defaultValues: toDefaults(item) });
  const title = watch("title");
  const gradient = watch("gradient");
  const imageUrl = watch("imageUrl");

  React.useEffect(() => {
    if (open) reset(toDefaults(item));
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = editing ? await updatePortfolioItemAction(item.id, values) : await createPortfolioItemAction(values);
    if (result.ok) {
      toast.success(result.message);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(key as keyof PortfolioInput, { message: messages[0] });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit portfolio item" : "Add to portfolio"}</DialogTitle>
          <DialogDescription>Showcase your best work. Public items appear on your profile page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl sm:col-span-2" style={{ background: gradient, minHeight: 120 }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-32 w-full object-cover" onError={(e) => ((e.currentTarget.style.display = "none"))} />
              ) : null}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-4">
                <p className="text-lg font-semibold text-white drop-shadow">{title || "Project title"}</p>
              </div>
            </div>
            <Field label="Title" htmlFor="portfolio-title" required error={formState.errors.title?.message} className="sm:col-span-2">
              <Input id="portfolio-title" placeholder="E-commerce platform for a fashion brand" autoFocus aria-invalid={!!formState.errors.title} {...register("title")} />
            </Field>
            <Field label="Category" htmlFor="portfolio-category" required error={formState.errors.category?.message}>
              <NativeSelect id="portfolio-category" {...register("category")}>
                {PORTFOLIO_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Completed on" htmlFor="portfolio-completed" error={formState.errors.completedOn?.message}>
              <Input id="portfolio-completed" type="date" {...register("completedOn")} />
            </Field>
            <Field label="Client (optional)" htmlFor="portfolio-client">
              <NativeSelect id="portfolio-client" {...register("clientId")}>
                <option value="">Not linked</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company ?? client.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Project (optional)" htmlFor="portfolio-project">
              <NativeSelect id="portfolio-project" {...register("projectId")}>
                <option value="">Not linked</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Live URL" htmlFor="portfolio-live" error={formState.errors.liveUrl?.message}>
              <Input id="portfolio-live" type="url" placeholder="https://" aria-invalid={!!formState.errors.liveUrl} {...register("liveUrl")} />
            </Field>
            <Field label="Repository / case study URL" htmlFor="portfolio-repo" error={formState.errors.repoUrl?.message}>
              <Input id="portfolio-repo" type="url" placeholder="https://" aria-invalid={!!formState.errors.repoUrl} {...register("repoUrl")} />
            </Field>
            <Field label="Cover image URL" htmlFor="portfolio-image" error={formState.errors.imageUrl?.message} className="sm:col-span-2">
              <Input id="portfolio-image" type="url" placeholder="https://… (leave empty to use a gradient cover)" aria-invalid={!!formState.errors.imageUrl} {...register("imageUrl")} />
            </Field>
            <Field label="Cover gradient" className="sm:col-span-2">
              <Controller
                control={control}
                name="gradient"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {GRADIENTS.map((g) => (
                      <button key={g} type="button" onClick={() => field.onChange(g)} className={cn("h-8 w-12 rounded-lg ring-2 ring-offset-2 ring-offset-card transition", field.value === g ? "ring-foreground" : "ring-transparent hover:scale-105")} style={{ background: g }} aria-label="Pick gradient" aria-pressed={field.value === g} />
                    ))}
                  </div>
                )}
              />
            </Field>
            <Field label="Tags / tech" className="sm:col-span-2">
              <Controller control={control} name="tags" render={({ field }) => <TagsInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="react, figma, shopify…" />} />
            </Field>
            <Field label="Description" htmlFor="portfolio-description" className="sm:col-span-2" error={formState.errors.description?.message}>
              <Textarea id="portfolio-description" rows={4} placeholder="What was the challenge, what did you build, and what was the outcome?" {...register("description")} />
            </Field>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <Controller
                control={control}
                name="visibility"
                render={({ field }) => (
                  <label className="flex items-center gap-3 text-sm">
                    <Switch checked={field.value === "public"} onCheckedChange={(checked: boolean) => field.onChange(checked ? "public" : "private")} />
                    <span>
                      <span className="font-medium">Public</span>
                      <span className="block text-xs text-muted-foreground">Visible on your public profile</span>
                    </span>
                  </label>
                )}
              />
              <Controller
                control={control}
                name="featured"
                render={({ field }) => (
                  <label className="flex items-center gap-3 text-sm">
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    <span>
                      <span className="font-medium">Featured</span>
                      <span className="block text-xs text-muted-foreground">Pin to the top</span>
                    </span>
                  </label>
                )}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {editing ? "Save changes" : "Add to portfolio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(item: PortfolioItem | null | undefined): PortfolioInput {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    category: item?.category ?? PORTFOLIO_CATEGORIES[0],
    tags: item?.tags ?? [],
    imageUrl: item?.imageUrl ?? "",
    liveUrl: item?.liveUrl ?? "",
    repoUrl: item?.repoUrl ?? "",
    gradient: item?.gradient ?? GRADIENTS[0],
    featured: item?.featured ?? false,
    visibility: item?.visibility ?? "public",
    completedOn: toDateInput(item?.completedOn),
    clientId: item?.clientId ?? "",
    projectId: item?.projectId ?? "",
  };
}
