"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  FolderKanban,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { RevenueAreaChart } from "@/components/charts/charts";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Progress } from "@/components/ui/primitives";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { dueLabel, formatRelative } from "@/lib/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import type { DashboardData, TaskListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function KpiCard({ label, value, delta, deltaLabel, icon: Icon, tone = "default", href }: { label: string; value: string; delta?: number; deltaLabel?: string; icon: React.ElementType; tone?: "default" | "warning" | "danger" | "success"; href?: string }) {
  const positive = (delta ?? 0) >= 0;
  const body = (
    <Card className="card-hover h-full gap-3 py-4">
      <CardContent className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular">{value}</p>
        </div>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tone === "danger" ? "bg-rose-500/10 text-rose-600" : tone === "warning" ? "bg-amber-500/10 text-amber-600" : tone === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary")}>
          <Icon className="size-4.5" />
        </span>
      </CardContent>
      <CardContent className="flex items-center gap-1.5 text-xs">
        {delta !== undefined ? (
          <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold", positive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta)}%
          </span>
        ) : null}
        <span className="text-muted-foreground">{deltaLabel}</span>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

function UpcomingTasks({ tasks }: { tasks: TaskListItem[] }) {
  const [optimistic, setOptimistic] = React.useOptimistic(tasks, (state, id: string) => state.filter((task) => task.id !== id));
  const [, startTransition] = React.useTransition();

  const complete = (task: TaskListItem) =>
    startTransition(async () => {
      setOptimistic(task.id);
      const result = await updateTaskStatusAction(task.id, "done");
      if (!result.ok) toast.error(result.error);
      else toast.success("Task completed", { description: task.title });
    });

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Up next</CardTitle>
          <CardDescription>Tasks with the nearest due dates</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/tasks">
            All tasks <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {optimistic.length === 0 ? (
          <EmptyState compact icon={<CheckCircle2 />} title="Nothing due soon" description="You're clear. Add a task to plan your next move." action={<Button asChild size="sm" variant="outline"><Link href="/tasks?new=1"><Plus /> New task</Link></Button>} />
        ) : (
          <ul className="-mx-2 divide-y">
            {optimistic.map((task) => {
              const due = dueLabel(task.dueDate);
              return (
                <li key={task.id} className="group flex items-center gap-3 px-2 py-2.5">
                  <button type="button" onClick={() => complete(task)} className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 transition hover:border-primary hover:bg-primary/10" aria-label={`Complete ${task.title}`}>
                    <CheckCircle2 className="size-3.5 text-primary opacity-0 transition group-hover:opacity-60" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {task.project ? (
                        <>
                          <span className="size-1.5 rounded-full" style={{ background: task.project.color }} />
                          <span className="truncate">{task.project.name}</span>
                        </>
                      ) : (
                        <span>Personal</span>
                      )}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-xs font-medium", due.tone === "danger" ? "text-rose-600" : due.tone === "warning" ? "text-amber-600" : "text-muted-foreground")}>{due.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardView({ data, userName, welcome }: { data: DashboardData; userName: string; welcome?: boolean }) {
  const { kpis, baseCurrency } = data;

  React.useEffect(() => {
    if (welcome) {
      toast.success(`Welcome to SkillOrbit, ${userName.split(" ")[0]}!`, { description: "We added a demo workspace so you can explore. Remove it anytime from Settings → Data." });
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [welcome, userName]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{userName.split(" ")[0]} 👋</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/clients?new=1">
              <Users /> Client
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/projects?new=1">
              <FolderKanban /> Project
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/tasks?new=1">
              <CheckSquare /> Task
            </Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link href="/invoices/new">
              <Plus /> Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue this month" value={formatMoneyCompact(kpis.revenueThisMonth, baseCurrency)} delta={kpis.revenueChange} deltaLabel={`vs ${formatMoneyCompact(kpis.revenueLastMonth, baseCurrency)} last month`} icon={Wallet} tone="success" href="/analytics" />
        <KpiCard label="Outstanding" value={formatMoneyCompact(kpis.outstanding, baseCurrency)} deltaLabel={kpis.overdueCount ? `${kpis.overdueCount} overdue · ${formatMoneyCompact(kpis.overdueAmount, baseCurrency)}` : "No overdue invoices"} icon={AlertCircle} tone={kpis.overdueCount ? "danger" : "default"} href="/invoices?status=open" />
        <KpiCard label="Active projects" value={String(kpis.activeProjects)} deltaLabel={kpis.completedProjectsThisMonth ? `${kpis.completedProjectsThisMonth} completed this month` : `${kpis.activeClients} active clients`} icon={FolderKanban} href="/projects?status=active" />
        <KpiCard label="Tasks due this week" value={String(kpis.tasksDueThisWeek)} deltaLabel={kpis.tasksOverdue ? `${kpis.tasksOverdue} overdue` : "Nothing overdue"} icon={Clock} tone={kpis.tasksOverdue ? "warning" : "default"} href="/tasks?due=week" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Revenue</CardTitle>
              <CardDescription>Collected vs invoiced · last 12 months · {baseCurrency}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/analytics">
                Analytics <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={data.revenueSeries} currency={baseCurrency} />
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <UpcomingTasks tasks={data.upcomingTasks} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Latest activity across all clients</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/invoices">
                All invoices <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <EmptyState compact icon={<FileText />} title="No invoices yet" description="Create your first invoice to start tracking income." action={<Button asChild size="sm"><Link href="/invoices/new"><Plus /> New invoice</Link></Button>} />
            ) : (
              <ul className="-mx-2 divide-y">
                {data.recentInvoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-muted/60">
                      <Avatar name={invoice.client.company ?? invoice.client.name} color={invoice.client.color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {invoice.number} <span className="font-normal text-muted-foreground">· {invoice.client.company ?? invoice.client.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{invoice.status === "paid" ? `Paid ${formatRelative(invoice.paidAt)}` : `Due ${dueLabel(invoice.dueDate).label.toLowerCase()}`}</p>
                      </div>
                      <span className="text-sm font-semibold tabular">{formatMoney(invoice.totalNumber, invoice.currency)}</span>
                      <StatusBadge kind="invoice" status={invoice.status} className="hidden sm:inline-flex" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Active projects</CardTitle>
              <CardDescription>Progress by completed tasks</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">
                All <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.activeProjects.length === 0 ? (
              <EmptyState compact icon={<FolderKanban />} title="No active projects" description="Start a project to track scope, budget and deadlines." action={<Button asChild size="sm" variant="outline"><Link href="/projects?new=1"><Plus /> New project</Link></Button>} />
            ) : (
              <ul className="space-y-4">
                {data.activeProjects.map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`} className="block space-y-1.5 rounded-lg transition hover:opacity-90">
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: project.color }} />
                          <span className="truncate">{project.name}</span>
                        </p>
                        <span className="text-xs font-medium tabular text-muted-foreground">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} color={project.color} size="sm" />
                      <p className="flex justify-between text-xs text-muted-foreground">
                        <span className="truncate">{project.client?.company ?? project.client?.name ?? "No client"}</span>
                        <span>{project.doneTaskCount}/{project.taskCount} tasks</span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>What happened lately in your workspace</CardDescription>
          </div>
          <Activity className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Activity will appear here as you work.</p>
          ) : (
            <ol className="relative space-y-4 border-l pl-5">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="relative">
                  <span className={cn("absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-card", item.action === "payment" ? "bg-emerald-500" : item.action === "completed" ? "bg-violet-500" : item.action === "deleted" || item.action === "cancelled" ? "bg-rose-400" : "bg-primary")} />
                  <p className="text-sm">
                    {item.title}
                    {item.meta && typeof item.meta.amount === "string" ? <span className="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular">{item.meta.amount}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRelative(item.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
