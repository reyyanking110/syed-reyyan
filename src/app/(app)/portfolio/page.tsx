import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { requireUser } from "@/lib/auth/dal";
import { getClientOptions } from "@/lib/queries/clients";
import { getPortfolioCategories, listPortfolioItems } from "@/lib/queries/portfolio";
import { getProjectOptions } from "@/lib/queries/projects";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const q = params.q?.trim() || undefined;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const [items, categories, clients, projects] = await Promise.all([listPortfolioItems(user.id, { q, category }), getPortfolioCategories(user.id), getClientOptions(user.id), getProjectOptions(user.id)]);
  return <PortfolioView items={items} clients={clients} projects={projects} categories={categories.map((row) => row.category)} username={user.username} portfolioPublic={user.portfolioPublic} appUrl={absoluteUrl()} hasFilters={Boolean(q || category)} />;
}
