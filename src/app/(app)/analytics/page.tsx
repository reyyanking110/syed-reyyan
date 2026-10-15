import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { requireUser } from "@/lib/auth/dal";
import { getAnalyticsData } from "@/lib/queries/analytics";
import type { AnalyticsRange } from "@/lib/queries/analytics";

export const metadata: Metadata = { title: "Analytics" };

const RANGES: AnalyticsRange[] = ["3m", "6m", "12m", "ytd"];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const range = RANGES.includes(params.range as AnalyticsRange) ? (params.range as AnalyticsRange) : "6m";
  const data = await getAnalyticsData(user, range);
  return <AnalyticsView data={data} range={range} baseCurrency={user.baseCurrency} usdToPkrRate={user.usdToPkrRate} />;
}
