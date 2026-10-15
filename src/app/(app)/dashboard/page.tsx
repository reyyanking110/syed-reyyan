import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireUser } from "@/lib/auth/dal";
import { getDashboardData } from "@/lib/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getDashboardData(user);
  return <DashboardView data={data} userName={user.name} welcome={params.welcome === "1"} />;
}
