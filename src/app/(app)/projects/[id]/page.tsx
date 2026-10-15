import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/projects/project-detail";
import { requireUser } from "@/lib/auth/dal";
import { getClientOptions } from "@/lib/queries/clients";
import { getProjectDetail } from "@/lib/queries/projects";
import { isUuid } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Project" };
  const user = await requireUser();
  const project = await getProjectDetail(user, id);
  return { title: project?.name ?? "Project" };
}

export default async function ProjectPage({ params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const [project, clients] = await Promise.all([getProjectDetail(user, id), getClientOptions(user.id)]);
  if (!project) notFound();
  return <ProjectDetailView project={project} clients={clients} baseCurrency={user.baseCurrency} />;
}
