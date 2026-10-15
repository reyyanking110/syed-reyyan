"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckSquare, Kanban, List, Plus } from "lucide-react";
import { TaskFormDialog } from "@/components/tasks/task-form";
import { TaskList } from "@/components/tasks/task-list";
import { ClearFilters, FilterChips, FilterSelect, SearchInput, useUrlParams } from "@/components/shared/client-utils";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { PRIORITY } from "@/lib/constants";
import type { ProjectOption, TaskListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Summary = { total: number; open: number; done: number; overdue: number; dueToday: number; dueWeek: number; inProgress: number; review: number };

export function TasksView({ tasks, projects, summary, hasFilters }: { tasks: TaskListItem[]; projects: ProjectOption[]; summary: Summary; hasFilters: boolean }) {
  const searchParams = useSearchParams();
  const { setParams } = useUrlParams();
  const view = (searchParams.get("view") as "list" | "board") ?? "list";
  const wantsNew = searchParams.get("new") === "1";
  const [createOpen, setCreateOpen] = React.useState(false);
  const closeCreate = () => {
    setCreateOpen(false);
    if (wantsNew) window.history.replaceState(null, "", "/tasks");
  };

  const completion = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={`${summary.open} open · ${summary.done} done · ${completion}% complete`}
        actions={
          <>
            <div className="flex rounded-lg border bg-card p-0.5">
              {(["list", "board"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setParams({ view: mode === "list" ? null : mode })} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium capitalize transition", view === mode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} aria-pressed={view === mode}>
                  {mode === "list" ? <List className="size-4" /> : <Kanban className="size-4" />} {mode}
                </button>
              ))}
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> New task
            </Button>
          </>
        }
      />

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Due today", value: summary.dueToday, param: "today", tone: summary.dueToday ? "text-amber-600" : "" },
          { label: "Overdue", value: summary.overdue, param: "overdue", tone: summary.overdue ? "text-rose-600" : "" },
          { label: "Due this week", value: summary.dueWeek, param: "week", tone: "" },
          { label: "In review", value: summary.review, param: null, tone: "" },
        ].map((stat) => (
          <Card key={stat.label} className={cn("cursor-pointer gap-0.5 px-4 py-3 transition hover:border-primary/40", stat.param === null && "cursor-default hover:border-border")} onClick={() => stat.param && setParams({ due: stat.param, status: "open" })}>
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className={cn("text-2xl font-semibold tabular", stat.tone)}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips param="status" defaultValue="open" options={[{ value: "open", label: "Open", count: summary.open }, { value: "todo", label: "To do" }, { value: "in_progress", label: "In progress", count: summary.inProgress }, { value: "review", label: "Review", count: summary.review }, { value: "done", label: "Done", count: summary.done }, { value: "all", label: "All", count: summary.total }]} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search tasks…" className="w-full sm:w-56" />
          <FilterSelect param="project" label="Project" options={[{ value: "all", label: "All projects" }, { value: "none", label: "Personal" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
          <FilterSelect param="priority" label="Priority" options={[{ value: "all", label: "Any priority" }, ...Object.entries(PRIORITY).map(([value, meta]) => ({ value, label: meta.label }))]} />
          <FilterSelect param="due" label="Due" options={[{ value: "all", label: "Any date" }, { value: "overdue", label: "Overdue" }, { value: "today", label: "Today" }, { value: "week", label: "This week" }, { value: "none", label: "No due date" }]} />
          <ClearFilters keys={["q", "status", "project", "priority", "due"]} />
        </div>
      </div>

      <TaskList
        tasks={tasks}
        projects={projects}
        view={view}
        emptyState={
          <EmptyState
            icon={<CheckSquare />}
            title={hasFilters ? "No tasks match" : "You're all caught up"}
            description={hasFilters ? "Try clearing a filter or two." : "Add a task above to plan your next move."}
            action={hasFilters ? <ClearFilters keys={["q", "status", "project", "priority", "due"]} /> : undefined}
          />
        }
      />

      <TaskFormDialog open={createOpen || wantsNew} onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreate())} projects={projects} />
    </div>
  );
}
