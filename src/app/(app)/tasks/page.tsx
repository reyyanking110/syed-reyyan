import type { Metadata } from "next";
import { TasksView } from "@/components/tasks/tasks-view";
import { requireUser } from "@/lib/auth/dal";
import { getProjectOptions } from "@/lib/queries/projects";
import { getTaskSummary, listTasks, type TaskFilters } from "@/lib/queries/tasks";

export const metadata: Metadata = { title: "Tasks" };

type Search = { q?: string; status?: string; project?: string; priority?: string; due?: string; view?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const filters: TaskFilters = {
    q: params.q,
    status: (params.status as TaskFilters["status"]) ?? "open",
    projectId: params.project && params.project !== "all" ? params.project : undefined,
    priority: params.priority && params.priority !== "all" ? (params.priority as TaskFilters["priority"]) : undefined,
    due: params.due && params.due !== "all" ? (params.due as TaskFilters["due"]) : undefined,
  };
  const hasFilters = Boolean(params.q || (params.status && params.status !== "open") || filters.projectId || filters.priority || filters.due);
  const [tasks, projects, summary] = await Promise.all([listTasks(user.id, filters), getProjectOptions(user.id), getTaskSummary(user.id)]);
  return <TasksView tasks={tasks} projects={projects} summary={summary} hasFilters={hasFilters} />;
}
