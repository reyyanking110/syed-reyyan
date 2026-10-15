"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Clock, Receipt, Wallet } from "lucide-react";
import { ChartLegend, DonutChart, PALETTE, RevenueAreaChart, SimpleBarChart } from "@/components/charts/charts";
import { useUrlParams } from "@/components/shared/client-utils";
import { Avatar, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Progress } from "@/components/ui/primitives";
import { INVOICE_STATUS, PAYMENT_METHOD, PROJECT_STATUS } from "@/lib/constants";
import type { Currency } from "@/db/schema";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import type { AnalyticsRange } from "@/lib/queries/analytics";
import type { AnalyticsData } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "12m", label: "12 months" },
  { value: "ytd", label: "Year to date" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#6366f1",
  partially_paid: "#f59e0b",
  paid: "#10b981",
  overdue: "#f43f5e",
  cancelled: "#cbd5e1",
  planning: "#94a3b8",
  in_progress: "#6366f1",
  on_hold: "#f59e0b",
  completed: "#10b981",
};

export function AnalyticsView({ data, range, baseCurrency, usdToPkrRate }: { data: AnalyticsData; range: AnalyticsRange; baseCurrency: Currency; usdToPkrRate: string }) {
  const { setParams } = useUrlParams();
  const { totals, revenueSeries, revenueByClient, revenueByCurrency, invoiceStatus, projectStatus, taskThroughput, paymentMethods, topProjects } = data;
  const hasData = totals.revenue > 0 || totals.invoiced > 0;
  const change = totals.previousRevenue > 0 || totals.revenue > 0 ? totals.revenueChange : null;

  const invoiceStatusItems = invoiceStatus
    .filter((row) => row.amount > 0)
    .map((row) => ({ name: INVOICE_STATUS[row.status].label, value: row.amount, color: STATUS_COLORS[row.status], meta: `${row.count} invoice${row.count === 1 ? "" : "s"}` }));
  const methodItems = paymentMethods.map((row, index) => ({ name: PAYMENT_METHOD[row.method], value: row.amount, color: PALETTE[index % PALETTE.length], meta: `${row.count} payment${row.count === 1 ? "" : "s"}` }));
  const totalProjects = projectStatus.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`${data.range.label} · reported in ${baseCurrency}`}
        actions={
          <div className="flex rounded-lg border bg-card p-0.5">
            {RANGES.map((option) => (
              <button key={option.value} type="button" onClick={() => setParams({ range: option.value === "6m" ? null : option.value })} className={cn("h-8 rounded-md px-3 text-sm font-medium transition", range === option.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} aria-pressed={range === option.value}>
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="stagger grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi icon={<Wallet className="size-4" />} label="Revenue collected" value={formatMoneyCompact(totals.revenue, baseCurrency)} hint={change === null ? "No prior period to compare" : `vs ${formatMoneyCompact(totals.previousRevenue, baseCurrency)} previous period`} trend={change} tone="indigo" />
        <Kpi icon={<Receipt className="size-4" />} label="Invoiced" value={formatMoneyCompact(totals.invoiced, baseCurrency)} hint={`${totals.invoicesCount} invoice${totals.invoicesCount === 1 ? "" : "s"} · avg ${formatMoneyCompact(totals.averageInvoice, baseCurrency)}`} tone="violet" />
        <Kpi icon={<Clock className="size-4" />} label="Avg. days to pay" value={totals.averageDaysToPay === null ? "—" : `${totals.averageDaysToPay}d`} hint={`${Math.round(totals.collectionRate)}% collection rate · ${totals.paidInvoicesCount} paid`} tone="emerald" />
        <Kpi icon={<CheckCircle2 className="size-4" />} label="Delivered" value={String(totals.projectsCompleted)} hint={`projects completed · ${totals.tasksCompleted} tasks done`} tone="amber" />
      </div>

      {!hasData ? (
        <EmptyState
          icon={<BarChart3 />}
          title="Not enough data yet"
          description="Analytics come alive once you send invoices and record payments. Create your first invoice to get started."
          action={
            <Link href="/invoices/new" className="text-sm font-medium text-primary hover:underline">
              Create an invoice →
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs invoiced</CardTitle>
            <CardDescription>Cash collected compared to what you billed each month</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={revenueSeries} currency={baseCurrency} height={280} showInvoiced />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoice status</CardTitle>
            <CardDescription>Value by status in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceStatusItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No invoices in this period.</p>
            ) : (
              <>
                <DonutChart data={invoiceStatusItems} currency={baseCurrency} height={200} centerLabel="Outstanding" centerValue={formatMoneyCompact(totals.outstanding, baseCurrency)} />
                <ChartLegend items={invoiceStatusItems} currency={baseCurrency} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top clients</CardTitle>
            <CardDescription>Revenue collected per client in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByClient.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payments in this period.</p>
            ) : (
              <ul className="space-y-4">
                {revenueByClient.map((client, index) => (
                  <li key={client.clientId}>
                    <div className="flex items-center gap-3">
                      <Avatar name={client.company ?? client.name} color={client.color} size="sm" />
                      <Link href={`/clients/${client.clientId}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                        {client.company ?? client.name}
                      </Link>
                      <span className="text-sm font-semibold tabular">{formatMoney(client.revenue, baseCurrency, { noDecimals: true })}</span>
                      <span className="w-10 text-right text-xs tabular text-muted-foreground">{client.share}%</span>
                    </div>
                    <Progress value={client.share} color={PALETTE[index % PALETTE.length]} size="sm" className="mt-2" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top projects</CardTitle>
            <CardDescription>Invoiced vs collected per project (in {baseCurrency})</CardDescription>
          </CardHeader>
          <CardContent>
            {topProjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No project billing yet.</p>
            ) : (
              <SimpleBarChart
                data={topProjects.map((project) => ({ name: project.name.length > 18 ? `${project.name.slice(0, 17)}…` : project.name, invoiced: project.invoiced, collected: project.paid }))}
                xKey="name"
                bars={[
                  { key: "invoiced", name: "Invoiced", color: PALETTE[1] },
                  { key: "collected", name: "Collected", color: PALETTE[0] },
                ]}
                currency={baseCurrency}
                height={260}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <CardDescription>How clients pay you</CardDescription>
          </CardHeader>
          <CardContent>
            {methodItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <>
                <DonutChart data={methodItems} currency={baseCurrency} height={180} />
                <ChartLegend items={methodItems} currency={baseCurrency} />
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Currency mix</CardTitle>
            <CardDescription>Collected in each currency (native amounts)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {revenueByCurrency.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              revenueByCurrency.map((row, index) => (
                <div key={row.currency}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.currency}</span>
                    <span className="tabular">{formatMoney(row.amount, row.currency, { noDecimals: true })}</span>
                  </div>
                  <Progress value={row.share} color={PALETTE[index % PALETTE.length]} size="sm" className="mt-1.5" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.share}% of revenue{row.currency !== baseCurrency ? ` · ≈ ${formatMoney(row.amountBase, baseCurrency, { noDecimals: true })}` : ""}
                  </p>
                </div>
              ))
            )}
            <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              Conversion rate: 1 USD = {Number(usdToPkrRate).toLocaleString()} PKR.{" "}
              <Link href="/settings?tab=business" className="text-primary hover:underline">
                Update
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Task throughput</CardTitle>
            <CardDescription>Tasks created vs completed per week</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={taskThroughput}
              xKey="label"
              bars={[
                { key: "created", name: "Created", color: PALETTE[1] },
                { key: "completed", name: "Completed", color: PALETTE[2] },
              ]}
              height={180}
              formatter={(value) => `${value} task${value === 1 ? "" : "s"}`}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">{totals.tasksCompleted} tasks completed in this period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project pipeline</CardTitle>
          <CardDescription>Where your {totalProjects} project{totalProjects === 1 ? "" : "s"} stand right now</CardDescription>
        </CardHeader>
        <CardContent>
          {totalProjects === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {projectStatus
                  .filter((row) => row.count > 0)
                  .map((row) => (
                    <div key={row.status} style={{ width: `${(row.count / totalProjects) * 100}%`, background: STATUS_COLORS[row.status] ?? "#94a3b8" }} title={`${PROJECT_STATUS[row.status].label}: ${row.count}`} />
                  ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                {projectStatus.map((row) => (
                  <div key={row.status} className="rounded-xl border p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ background: STATUS_COLORS[row.status] ?? "#94a3b8" }} /> {PROJECT_STATUS[row.status].label}
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular">{row.count}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, hint, trend, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; trend?: number | null; tone: "indigo" | "violet" | "emerald" | "amber" }) {
  const tones = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <Card className="gap-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
        {typeof trend === "number" ? (
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium", trend >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
            {trend >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular">{value}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  );
}
