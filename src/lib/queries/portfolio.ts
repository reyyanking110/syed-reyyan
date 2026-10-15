import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clients, portfolioItems, projects, users } from "@/db/schema";
import type { PortfolioListItem } from "@/lib/types";

export type PortfolioFilters = { q?: string; category?: string; visibility?: "all" | "public" | "private" | "featured" };

export async function listPortfolioItems(userId: string, filters: PortfolioFilters = {}): Promise<PortfolioListItem[]> {
  const conditions: SQL[] = [eq(portfolioItems.userId, userId)];
  if (filters.category && filters.category !== "all") conditions.push(eq(portfolioItems.category, filters.category));
  if (filters.visibility === "public" || filters.visibility === "private") conditions.push(eq(portfolioItems.visibility, filters.visibility));
  if (filters.visibility === "featured") conditions.push(eq(portfolioItems.featured, true));
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(portfolioItems.title, term), ilike(portfolioItems.description, term), sql`array_to_string(${portfolioItems.tags}, ' ') ilike ${term}`)!);
  }

  const rows = await db
    .select({
      item: portfolioItems,
      client: { id: clients.id, name: clients.name, company: clients.company },
      project: { id: projects.id, name: projects.name },
    })
    .from(portfolioItems)
    .leftJoin(clients, eq(clients.id, portfolioItems.clientId))
    .leftJoin(projects, eq(projects.id, portfolioItems.projectId))
    .where(and(...conditions))
    .orderBy(desc(portfolioItems.featured), asc(portfolioItems.position), desc(portfolioItems.createdAt));

  return rows.map(({ item, client, project }) => ({ ...item, client: client?.id ? client : null, project: project?.id ? project : null }));
}

export async function getPortfolioCategories(userId: string) {
  const rows = await db
    .select({ category: portfolioItems.category, count: sql<number>`count(*)::int` })
    .from(portfolioItems)
    .where(eq(portfolioItems.userId, userId))
    .groupBy(portfolioItems.category)
    .orderBy(desc(sql`count(*)`));
  return rows;
}

export async function getPublicPortfolio(username: string) {
  const [owner] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      profession: users.profession,
      headline: users.headline,
      bio: users.bio,
      skills: users.skills,
      location: users.location,
      website: users.website,
      avatarUrl: users.avatarUrl,
      email: users.email,
      isGuest: users.isGuest,
      portfolioPublic: users.portfolioPublic,
      businessName: users.businessName,
    })
    .from(users)
    .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
    .limit(1);

  if (!owner || !owner.portfolioPublic) return null;

  const items = await db
    .select({
      item: portfolioItems,
      client: { id: clients.id, name: clients.name, company: clients.company },
    })
    .from(portfolioItems)
    .leftJoin(clients, eq(clients.id, portfolioItems.clientId))
    .where(and(eq(portfolioItems.userId, owner.id), eq(portfolioItems.visibility, "public")))
    .orderBy(desc(portfolioItems.featured), asc(portfolioItems.position), desc(portfolioItems.createdAt));

  const [stats] = await db
    .select({
      clients: sql<number>`(select count(*) from ${clients} where ${clients.userId} = ${owner.id})::int`,
      projects: sql<number>`(select count(*) from ${projects} where ${projects.userId} = ${owner.id} and ${projects.status} = 'completed')::int`,
    })
    .from(users)
    .where(eq(users.id, owner.id));

  return {
    owner,
    items: items.map(({ item, client }) => ({ ...item, client: client?.id ? client : null })),
    stats: { clients: stats?.clients ?? 0, completedProjects: stats?.projects ?? 0 },
  };
}
