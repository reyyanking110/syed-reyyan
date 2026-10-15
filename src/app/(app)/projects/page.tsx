import type { Metadata } from "next";
import { ProjectsView } from "@/components/projects/projects-view";
import { requireUser } from "@/lib/auth/dal";
import { getClientOptions } from "@/lib/queries/clients";
import { listProjects, type ProjectFilters } from "@/lib/queries/projects";

export const metadata: Metadata = { title: "Projects" };

type Search = { q?: string; status?: string; client?: string; sort?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const filters: ProjectFilters = {
    q: params.q,
    status: (params.status as ProjectFilters["status"]) ?? "all",
    clientId: params.client && params.client !== "all" ? params.client : undefined,
    sort: (params.sort as ProjectFilters["sort"]) ?? "recent",
  };
  const hasFilters = Boolean(params.q || (params.status && params.status !== "all") || filters.clientId);
  const [projects, allProjects, clients] = await Promise.all([listProjects(user, filters), listProjects(user), getClientOptions(user.id)]);
  const counts = allProjects.reduce<Record<string, number>>((acc, project) => {
    acc.all = (acc.all ?? 0) + 1;
    acc[project.status] = (acc[project.status] ?? 0) + 1;
    return acc;
  }, {});
  return <ProjectsView projects={projects} clients={clients} baseCurrency={user.baseCurrency} counts={counts} hasFilters={hasFilters} />;
}
