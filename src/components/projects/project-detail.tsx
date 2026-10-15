"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, CheckSquare, FileText, FolderKanban, MoreHorizontal, Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ProjectFormDialog } from "@/components/projects/project-form";
import { TaskList } from "@/components/tasks/task-list";
import { ConfirmDialog, useAction } from "@/components/shared/client-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress } from "@/components/ui/primitives";
import { deleteProjectAction, updateProjectStatusAction } from "@/lib/actions/projects";
import { BILLING_TYPE, PROJECT_STATUS } from "@/lib/constants";
import type { Currency, ProjectStatus } from "@/db/schema";
import { dueLabel, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ProjectDetail } from "@/lib/queries/projects";
import type { ClientOption, ProjectOption, TaskListItem } from "@/lib/types";
import { cn, toNumber } from "@/lib/utils";

export function ProjectDetailView({ project, clients, baseCurrency }: { project: ProjectDetail; clients: ClientOption[]; baseCurrency: Currency }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [status, setStatus] = React.useOptimistic(project.status);
  const [, startTransition] = React.useTransition();
  const { run, pending } = useAction();

  const projectOption: ProjectOption = { id: project.id, name: project.name, color: project.color, currency: project.currency, clientId: project.clientId, status: project.status };
  const { taskCount, doneTaskCount, progress } = project.stats;
  const taskItems: TaskListItem[] = project.tasks.map((task) => ({ ...task, project: { id: project.id, name: project.name, color: project.color } }));
  const due = dueLabel(project.dueDate);
  const budget = project.budget ? toNumber(project.budget) : null;
  const invoiced = project.stats.invoiced;
  const paid = project.stats.paid;
  const budgetUsed = budget ? Math.min(100, Math.round((invoiced / budget) * 100)) : null;
  const totalHours = project.tasks.reduce((sum, task) => sum + toNumber(task.estimatedHours), 0);

  const changeStatus = (next: ProjectStatus) =>
    startTransition(async () => {
      setStatus(next);
      const result = await updateProjectStatusAction(project.id, next);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Projects
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: `linear-gradient(135deg, ${project.color}, color-mix(in oklch, ${project.color} 65%, black))` }}>
            <FolderKanban className="size-7" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
              <StatusBadge kind="project" status={status} />
              <StatusBadge kind="priority" status={project.priority} dot={false} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {project.client ? (
                <Link href={`/clients/${project.client.id}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Avatar name={project.client.company ?? project.client.name} color={project.client.color} size="xs" className="ring-0" />
                  {project.client.company ?? project.client.name}
                </Link>
              ) : (
                <span>Internal project</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                {project.startDate ? `${formatDate(project.startDate)} → ` : ""}
                {project.dueDate ? formatDate(project.dueDate) : "No due date"}
              </span>
              {status !== "completed" && status !== "cancelled" && project.dueDate ? <span className={cn("font-medium", due.tone === "danger" ? "text-rose-600" : due.tone === "warning" ? "text-amber-600" : "")}>{due.label}</span> : null}
            </div>
            {project.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <Badge key={tag} tone="muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/invoices/new?project=${project.id}${project.clientId ? `&client=${project.clientId}` : ""}`}>
              <Receipt /> Invoice
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={status} onValueChange={(value) => changeStatus(value as ProjectStatus)}>
                {Object.entries(PROJECT_STATUS).map(([value, meta]) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {meta.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 /> Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Progress</p>
          <p className="text-2xl font-semibold tabular">{progress}%</p>
          <Progress value={progress} color={project.color} size="sm" />
          <p className="text-xs text-muted-foreground">{doneTaskCount} of {taskCount} tasks done{totalHours ? ` · ${totalHours}h estimated` : ""}</p>
        </Card>
        <Card className="gap-1 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">{BILLING_TYPE[project.billingType]} {project.billingType === "hourly" ? "rate" : "budget"}</p>
          <p className="text-2xl font-semibold tabular">{project.billingType === "hourly" && project.hourlyRate ? `${formatMoney(project.hourlyRate, project.currency)}/h` : budget ? formatMoney(budget, project.currency, { noDecimals: true }) : "—"}</p>
          {budgetUsed !== null ? (
            <>
              <Progress value={budgetUsed} color={budgetUsed >= 100 ? "#f43f5e" : "#6366f1"} size="sm" className="mt-1" />
              <p className="text-xs text-muted-foreground">{budgetUsed}% invoiced</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{project.billingType === "hourly" ? `${formatMoney(invoiced, project.currency, { noDecimals: true })} billed so far` : "No budget set"}</p>
          )}
        </Card>
        <Card className="gap-1 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Invoiced</p>
          <p className="text-2xl font-semibold tabular">{formatMoney(invoiced, project.currency, { noDecimals: true })}</p>
          <p className="text-xs text-muted-foreground">{project.invoices.length} invoice{project.invoices.length === 1 ? "" : "s"}</p>
        </Card>
        <Card className="gap-1 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Collected</p>
          <p className="text-2xl font-semibold tabular text-emerald-600">{formatMoney(paid, project.currency, { noDecimals: true })}</p>
          <p className="text-xs text-muted-foreground">{formatMoney(Math.max(0, invoiced - paid), project.currency, { noDecimals: true })} outstanding</p>
        </Card>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            <CheckSquare className="size-4" /> Tasks <span className="ml-1 text-xs text-muted-foreground">{taskCount}</span>
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="size-4" /> Invoices <span className="ml-1 text-xs text-muted-foreground">{project.invoices.length}</span>
          </TabsTrigger>
          <TabsTrigger value="about">
            <FileText className="size-4" /> About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TaskList
            tasks={taskItems}
            projects={[projectOption]}
            defaultProjectId={project.id}
            showProject={false}
            emptyState={<EmptyState compact icon={<CheckSquare />} title="No tasks yet" description="Add the first task above to start tracking progress." />}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {project.invoices.length === 0 ? (
            <EmptyState
              compact
              icon={<Receipt />}
              title="No invoices for this project"
              description="Bill milestones or hours directly from here."
              action={
                <Button asChild>
                  <Link href={`/invoices/new?project=${project.id}${project.clientId ? `&client=${project.clientId}` : ""}`}>
                    <Plus /> New invoice
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
              {project.invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-muted/40">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Wallet className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}</p>
                    </div>
                    <StatusBadge kind="invoice" status={invoice.status} />
                    <span className="w-28 text-right text-sm font-semibold tabular">{formatMoney(invoice.total, invoice.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{project.description || "No description yet. Add scope, deliverables or links so everything about this engagement lives in one place."}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Billing</dt>
                  <dd className="font-medium">{BILLING_TYPE[project.billingType]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Currency</dt>
                  <dd className="font-medium">{project.currency}{project.currency !== baseCurrency ? ` (reports in ${baseCurrency})` : ""}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{project.completedAt ? "Completed" : "Last updated"}</dt>
                  <dd className="font-medium">{formatDate(project.completedAt ?? project.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} clients={clients} defaultCurrency={baseCurrency} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${project.name}”?`}
        description={`${taskCount} task(s) will be deleted. Invoices remain but lose their project link.`}
        confirmLabel="Delete project"
        pending={pending}
        onConfirm={() => run(deleteProjectAction(project.id), { onSuccess: () => router.push("/projects") })}
      />
    </div>
  );
}
