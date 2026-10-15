"use client";

import * as React from "react";
import { Check, Clock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TaskFormDialog } from "@/components/tasks/task-form";
import { ConfirmDialog, useAction } from "@/components/shared/client-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Input, NativeSelect } from "@/components/ui/primitives";
import { deleteTaskAction, quickCreateTaskAction, updateTaskStatusAction } from "@/lib/actions/tasks";
import { TASK_STATUS, TASK_STATUS_ORDER } from "@/lib/constants";
import type { Task, TaskStatus } from "@/db/schema";
import { dueLabel } from "@/lib/dates";
import type { ProjectOption, TaskListItem } from "@/lib/types";
import { cn, toNumber } from "@/lib/utils";

type OptimisticUpdate = { id: string; status?: TaskStatus; remove?: boolean } | { add: TaskListItem };

export function useOptimisticTasks(tasks: TaskListItem[]) {
  return React.useOptimistic(tasks, (state, update: OptimisticUpdate) => {
    if ("add" in update) return [update.add, ...state];
    if (update.remove) return state.filter((task) => task.id !== update.id);
    return state.map((task) => (task.id === update.id ? { ...task, status: update.status ?? task.status, completedAt: update.status === "done" ? new Date() : null } : task));
  });
}

export function QuickAddTask({ projects, defaultProjectId, onOptimisticAdd, compact }: { projects: ProjectOption[]; defaultProjectId?: string | null; onOptimisticAdd?: (task: TaskListItem) => void; compact?: boolean }) {
  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? "");
  const [dueDate, setDueDate] = React.useState("");
  const [, startTransition] = React.useTransition();
  const { run, pending } = useAction();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      toast.error("Give the task a short title (2+ characters).");
      return;
    }
    const project = projects.find((p) => p.id === projectId) ?? null;
    const temp: TaskListItem = {
      id: `temp-${Date.now()}`,
      userId: "",
      projectId: project?.id ?? null,
      title: trimmed,
      description: null,
      status: "todo",
      priority: "medium",
      dueDate: dueDate || null,
      estimatedHours: null,
      position: 0,
      completedAt: null,
      isDemo: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: project ? { id: project.id, name: project.name, color: project.color } : null,
    };
    startTransition(async () => {
      onOptimisticAdd?.(temp);
      setTitle("");
      await run(quickCreateTaskAction({ title: trimmed, projectId: projectId || "", dueDate, priority: "medium" }), { success: "Task added" });
    });
  };

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-card sm:flex-row sm:items-center", compact && "sm:p-1.5")}>
      <div className="flex flex-1 items-center gap-2 pl-2">
        <Plus className="size-4 shrink-0 text-muted-foreground" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter…" className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" aria-label="New task title" />
      </div>
      <div className="flex items-center gap-2">
        {defaultProjectId === undefined ? (
          <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 w-40 text-xs" aria-label="Project">
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 w-36 text-xs" aria-label="Due date" />
        <Button type="submit" size="sm" loading={pending}>
          Add
        </Button>
      </div>
    </form>
  );
}

export function TaskRow({ task, onStatus, onDelete, onEdit, showProject = true }: { task: TaskListItem; onStatus: (status: TaskStatus) => void; onDelete: () => void; onEdit: () => void; showProject?: boolean }) {
  const done = task.status === "done";
  const due = dueLabel(task.dueDate);
  return (
    <li className={cn("group flex items-start gap-3 px-4 py-3 transition hover:bg-muted/40 sm:items-center", done && "opacity-60")}>
      <button
        type="button"
        onClick={() => onStatus(done ? "todo" : "done")}
        className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition sm:mt-0", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10")}
        aria-label={done ? "Mark as to do" : "Mark as done"}
        aria-pressed={done}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onEdit} className={cn("block max-w-full truncate text-left text-sm font-medium hover:underline", done && "line-through")}>
          {task.title}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {showProject ? (
            task.project ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: task.project.color }} /> {task.project.name}
              </span>
            ) : (
              <span>Personal</span>
            )
          ) : null}
          {task.dueDate ? (
            <span className={cn("inline-flex items-center gap-1", !done && due.tone === "danger" ? "font-medium text-rose-600" : !done && due.tone === "warning" ? "font-medium text-amber-600" : "")}>
              <Clock className="size-3" /> {due.label}
            </span>
          ) : null}
          {task.estimatedHours ? <span>{toNumber(task.estimatedHours)}h est.</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusBadge kind="priority" status={task.priority} dot={false} className="hidden sm:inline-flex" />
        <StatusBadge kind="task" status={task.status} className="hidden md:inline-flex" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Task actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={task.status} onValueChange={(value) => onStatus(value as TaskStatus)}>
              {TASK_STATUS_ORDER.map((status) => (
                <DropdownMenuRadioItem key={status} value={status}>
                  {TASK_STATUS[status].label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/**
 * Shared, optimistic task list used on the Tasks page and project detail page.
 */
export function TaskList({ tasks, projects, view = "list", defaultProjectId, showProject = true, emptyState }: { tasks: TaskListItem[]; projects: ProjectOption[]; view?: "list" | "board"; defaultProjectId?: string | null; showProject?: boolean; emptyState?: React.ReactNode }) {
  const [optimistic, applyOptimistic] = useOptimisticTasks(tasks);
  const [, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [creating, setCreating] = React.useState<{ status: TaskStatus } | null>(null);
  const [deleting, setDeleting] = React.useState<TaskListItem | null>(null);
  const { run, pending } = useAction();

  const changeStatus = (task: TaskListItem, status: TaskStatus) =>
    startTransition(async () => {
      applyOptimistic({ id: task.id, status });
      const result = await updateTaskStatusAction(task.id, status);
      if (!result.ok) toast.error(result.error);
      else if (status === "done") toast.success("Task completed", { description: task.title });
    });

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    await run(deleteTaskAction(target.id), { onSuccess: () => { setDeleting(null); startTransition(() => applyOptimistic({ id: target.id, remove: true })); } });
  };

  const rowProps = (task: TaskListItem) => ({
    task,
    showProject,
    onStatus: (status: TaskStatus) => changeStatus(task, status),
    onDelete: () => setDeleting(task),
    onEdit: () => setEditing(task),
  });

  return (
    <div className="space-y-3">
      <QuickAddTask projects={projects} defaultProjectId={defaultProjectId} onOptimisticAdd={(task) => applyOptimistic({ add: task })} compact />

      {optimistic.length === 0 ? (
        emptyState ?? null
      ) : view === "board" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUS_ORDER.map((status) => {
            const column = optimistic.filter((task) => task.status === status);
            return (
              <div key={status} className="flex min-h-40 flex-col rounded-2xl border bg-muted/30">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className={cn("size-2 rounded-full", TASK_STATUS[status].dot)} /> {TASK_STATUS[status].label}
                    <span className="rounded-full bg-background px-1.5 text-xs tabular text-muted-foreground">{column.length}</span>
                  </p>
                  <Button variant="ghost" size="icon-xs" onClick={() => setCreating({ status })} aria-label={`Add task to ${TASK_STATUS[status].label}`}>
                    <Plus />
                  </Button>
                </div>
                <ul className="flex-1 space-y-2 px-2 pb-2">
                  {column.map((task) => (
                    <li key={task.id} className="rounded-xl border bg-card shadow-card">
                      <ul>
                        <TaskRow {...rowProps(task)} />
                      </ul>
                    </li>
                  ))}
                  {column.length === 0 ? <li className="px-3 py-6 text-center text-xs text-muted-foreground">No tasks</li> : null}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
          {optimistic.map((task) => (
            <TaskRow key={task.id} {...rowProps(task)} />
          ))}
        </ul>
      )}

      <TaskFormDialog open={!!editing || !!creating} onOpenChange={(open) => { if (!open) { setEditing(null); setCreating(null); } }} task={editing} projects={projects} defaultProjectId={defaultProjectId} defaultStatus={creating?.status} />
      <ConfirmDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)} title="Delete this task?" description={deleting?.title} confirmLabel="Delete task" pending={pending} onConfirm={confirmDelete} />
    </div>
  );
}
