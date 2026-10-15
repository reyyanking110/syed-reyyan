"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, FolderKanban, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectFormDialog } from "@/components/projects/project-form";
import { ClearFilters, ConfirmDialog, FilterChips, FilterSelect, SearchInput, useAction } from "@/components/shared/client-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Avatar, Badge, Card, EmptyState, PageHeader, Progress } from "@/components/ui/primitives";
import { deleteProjectAction, updateProjectStatusAction } from "@/lib/actions/projects";
import { BILLING_TYPE, PROJECT_STATUS } from "@/lib/constants";
import type { Currency, Project, ProjectStatus } from "@/db/schema";
import { dueLabel, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ClientOption, ProjectListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { projects: ProjectListItem[]; clients: ClientOption[]; baseCurrency: Currency; counts: Record<string, number>; hasFilters: boolean };

export function ProjectsView({ projects, clients, baseCurrency, counts, hasFilters }: Props) {
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState<ProjectListItem | null>(null);
  const wantsNew = searchParams.get("new") === "1";
  const [defaultClient, setDefaultClient] = React.useState<string | null>(null);
  const { run, pending } = useAction();
  const [optimistic, applyOptimistic] = React.useOptimistic(projects, (state, update: { id: string; status?: ProjectStatus; remove?: boolean }) =>
    update.remove ? state.filter((p) => p.id !== update.id) : state.map((p) => (p.id === update.id ? { ...p, status: update.status ?? p.status, progress: update.status === "completed" ? 100 : p.progress } : p)),
  );
  const [, startTransition] = React.useTransition();

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setDefaultClient(null);
    if (wantsNew) window.history.replaceState(null, "", "/projects");
  };

  const changeStatus = (project: ProjectListItem, status: ProjectStatus) =>
    startTransition(async () => {
      applyOptimistic({ id: project.id, status });
      const result = await updateProjectStatusAction(project.id, status);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${counts.all ?? 0} total · ${counts.in_progress ?? 0} in progress · ${counts.completed ?? 0} completed`}
        actions={
          <Button onClick={() => { setEditing(null); setDefaultClient(null); setFormOpen(true); }}>
            <Plus /> New project
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          param="status"
          options={[
            { value: "all", label: "All", count: counts.all ?? 0 },
            { value: "active", label: "Active", count: (counts.planning ?? 0) + (counts.in_progress ?? 0) },
            { value: "in_progress", label: "In progress", count: counts.in_progress ?? 0 },
            { value: "on_hold", label: "On hold", count: counts.on_hold ?? 0 },
            { value: "completed", label: "Completed", count: counts.completed ?? 0 },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search projects…" className="w-full sm:w-64" />
          <FilterSelect param="client" label="Client" options={[{ value: "all", label: "All clients" }, ...clients.map((c) => ({ value: c.id, label: c.company ?? c.name }))]} />
          <FilterSelect param="sort" label="Sort" defaultValue="recent" options={[{ value: "recent", label: "Recently updated" }, { value: "due", label: "Due date" }, { value: "name", label: "Name A–Z" }]} />
          <ClearFilters keys={["q", "status", "client", "sort"]} />
        </div>
      </div>

      {optimistic.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title={hasFilters ? "No projects match" : "No projects yet"}
          description={hasFilters ? "Try different filters or a broader search." : "Projects keep tasks, budgets and invoices together. Create your first one."}
          action={hasFilters ? <ClearFilters keys={["q", "status", "client", "sort"]} /> : <Button onClick={() => setFormOpen(true)}><Plus /> Create a project</Button>}
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {optimistic.map((project) => {
            const due = dueLabel(project.dueDate);
            const budget = project.budget ? Number(project.budget) : null;
            return (
              <Card key={project.id} className="card-hover group relative gap-4 py-4">
                <div className="flex items-start gap-3 px-5">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${project.color}, color-mix(in oklch, ${project.color} 65%, black))` }}>
                    <FolderKanban className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/projects/${project.id}`} className="block truncate font-semibold hover:underline">
                      {project.name}
                    </Link>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      {project.client ? (
                        <>
                          <Avatar name={project.client.company ?? project.client.name} color={project.client.color} size="xs" className="ring-0" />
                          {project.client.company ?? project.client.name}
                        </>
                      ) : (
                        "Internal project"
                      )}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Project actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>
                          <FolderKanban /> Open
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setEditing(project); setFormOpen(true); }}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={project.status} onValueChange={(value) => changeStatus(project, value as ProjectStatus)}>
                        {Object.entries(PROJECT_STATUS).map(([value, meta]) => (
                          <DropdownMenuRadioItem key={value} value={value}>
                            {meta.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(project)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="px-5">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">{project.description ?? "No description yet."}</p>
                </div>

                <div className="space-y-2 px-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{project.doneTaskCount}/{project.taskCount} tasks</span>
                    <span className="font-medium tabular">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} color={project.color} size="sm" />
                </div>

                <div className="flex flex-wrap items-center gap-2 px-5">
                  <StatusBadge kind="project" status={project.status} />
                  <StatusBadge kind="priority" status={project.priority} dot={false} />
                  <Badge tone="outline">{BILLING_TYPE[project.billingType]}</Badge>
                </div>

                <div className="flex items-center justify-between border-t px-5 pt-3 text-xs">
                  <span className={cn("inline-flex items-center gap-1", project.status === "completed" ? "text-muted-foreground" : due.tone === "danger" ? "text-rose-600" : due.tone === "warning" ? "text-amber-600" : "text-muted-foreground")}>
                    <Calendar className="size-3.5" /> {project.status === "completed" ? `Completed ${formatDate(project.completedAt)}` : due.label}
                  </span>
                  <span className="font-medium tabular">
                    {budget ? (
                      <>
                        {formatMoney(project.invoicedTotal, project.currency, { noDecimals: true })} <span className="font-normal text-muted-foreground">/ {formatMoney(budget, project.currency, { noDecimals: true })}</span>
                      </>
                    ) : (
                      formatMoney(project.invoicedTotal, project.currency, { noDecimals: true })
                    )}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectFormDialog open={formOpen || wantsNew} onOpenChange={(open) => (open ? setFormOpen(true) : closeForm())} project={editing} clients={clients} defaultClientId={defaultClient ?? (wantsNew ? searchParams.get("client") : null)} defaultCurrency={baseCurrency} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        description={`${deleting?.taskCount ?? 0} task(s) will be deleted with it. Invoices stay but lose their project link. This cannot be undone.`}
        confirmLabel="Delete project"
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          const target = deleting;
          await run(deleteProjectAction(target.id), { onSuccess: () => { setDeleting(null); startTransition(() => applyOptimistic({ id: target.id, remove: true })); } });
        }}
      />
    </div>
  );
}
