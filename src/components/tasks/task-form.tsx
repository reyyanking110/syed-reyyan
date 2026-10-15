"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { PRIORITY, TASK_STATUS } from "@/lib/constants";
import type { Task } from "@/db/schema";
import { toDateInput } from "@/lib/dates";
import type { ProjectOption } from "@/lib/types";
import { taskSchema, type TaskInput } from "@/lib/validations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projects: ProjectOption[];
  defaultProjectId?: string | null;
  defaultStatus?: Task["status"];
};

export function TaskFormDialog({ open, onOpenChange, task, projects, defaultProjectId, defaultStatus }: Props) {
  const router = useRouter();
  const editing = !!task;
  const form = useForm<TaskInput>({ resolver: zodResolver(taskSchema, undefined, { raw: true }), defaultValues: toDefaults(task, defaultProjectId, defaultStatus) });
  const { register, handleSubmit, reset, setError, formState } = form;

  React.useEffect(() => {
    if (open) reset(toDefaults(task, defaultProjectId, defaultStatus));
  }, [open, task, defaultProjectId, defaultStatus, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = editing ? await updateTaskAction(task.id, values) : await createTaskAction(values);
    if (result.ok) {
      toast.success(result.message);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(key as keyof TaskInput, { message: messages[0] });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>{editing ? "Update the details of this task." : "Break work into clear, finishable steps."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="task-title" required error={formState.errors.title?.message} className="sm:col-span-2">
              <Input id="task-title" placeholder="Design the checkout flow" autoFocus aria-invalid={!!formState.errors.title} {...register("title")} />
            </Field>
            <Field label="Project" htmlFor="task-project" className="sm:col-span-2">
              <NativeSelect id="task-project" {...register("projectId")}>
                <option value="">No project (personal)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Status" htmlFor="task-status">
              <NativeSelect id="task-status" {...register("status")}>
                {Object.entries(TASK_STATUS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Priority" htmlFor="task-priority">
              <NativeSelect id="task-priority" {...register("priority")}>
                {Object.entries(PRIORITY).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Due date" htmlFor="task-due" error={formState.errors.dueDate?.message}>
              <Input id="task-due" type="date" {...register("dueDate")} />
            </Field>
            <Field label="Estimated hours" htmlFor="task-hours" error={formState.errors.estimatedHours?.message}>
              <Input id="task-hours" type="number" step="0.5" min="0" placeholder="2" {...register("estimatedHours")} />
            </Field>
            <Field label="Description" htmlFor="task-description" className="sm:col-span-2" error={formState.errors.description?.message}>
              <Textarea id="task-description" rows={3} placeholder="Acceptance criteria, links, notes…" {...register("description")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {editing ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(task: Task | null | undefined, projectId: string | null | undefined, status: Task["status"] | undefined): TaskInput {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    projectId: task?.projectId ?? projectId ?? "",
    status: task?.status ?? status ?? "todo",
    priority: task?.priority ?? "medium",
    dueDate: toDateInput(task?.dueDate),
    estimatedHours: task?.estimatedHours ?? "",
  };
}
