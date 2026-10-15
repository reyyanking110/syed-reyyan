"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Currency } from "@/db/schema";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import type { MonthlyPoint } from "@/lib/types";

const PALETTE = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316", "#14b8a6"];

function ChartTooltip({ active, payload, label, currency, formatter }: { active?: boolean; payload?: { name: string; value: number; color?: string; payload?: Record<string, unknown> }[]; label?: string; currency?: Currency; formatter?: (value: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-float">
      {label ? <p className="mb-1 font-semibold text-foreground">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: entry.color ?? "#6366f1" }} />
              {entry.name}
            </span>
            <span className="font-medium tabular text-foreground">{formatter ? formatter(entry.value) : currency ? formatMoney(entry.value, currency) : entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RevenueAreaChart({ data, currency, height = 260, showInvoiced = true }: { data: MonthlyPoint[]; currency: Currency; height?: number; showInvoiced?: boolean }) {
  const empty = data.every((point) => point.revenue === 0 && point.invoiced === 0);
  return (
    <div style={{ height }} className="relative w-full">
      {empty ? <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">No revenue recorded yet.</p> : null}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="invoicedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" tickFormatter={(value) => formatMoneyCompact(value, currency)} width={64} />
          <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: "#6366f1", strokeOpacity: 0.2 }} />
          {showInvoiced ? <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#invoicedFill)" /> : null}
          <Area type="monotone" dataKey="revenue" name="Collected" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBarChart({ data, xKey, bars, currency, height = 240, stacked, formatter }: { data: Record<string, unknown>[]; xKey: string; bars: { key: string; name: string; color?: string }[]; currency?: Currency; height?: number; stacked?: boolean; formatter?: (value: number) => string }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap={bars.length > 1 ? "25%" : "35%"}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" dy={6} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" allowDecimals={false} tickFormatter={(value) => (currency ? formatMoneyCompact(value, currency) : String(value))} width={currency ? 64 : 32} />
          <Tooltip content={<ChartTooltip currency={currency} formatter={formatter} />} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} />
          {bars.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} /> : null}
          {bars.map((bar, index) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.name} stackId={stacked ? "stack" : undefined} fill={bar.color ?? PALETTE[index % PALETTE.length]} radius={stacked && index < bars.length - 1 ? 0 : [6, 6, 0, 0]} maxBarSize={44} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, currency, height = 220, formatter, centerLabel, centerValue }: { data: { name: string; value: number; color?: string }[]; currency?: Currency; height?: number; formatter?: (value: number) => string; centerLabel?: string; centerValue?: string }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">Nothing to show yet.</div>;
  return (
    <div style={{ height }} className="relative w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={3} cornerRadius={6} stroke="none">
            {filtered.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color ?? PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency={currency} formatter={formatter} />} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold tabular">{centerValue}</span>
          {centerLabel ? <span className="text-[11px] text-muted-foreground">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChartLegend({ items, currency, formatter }: { items: { name: string; value: number; color?: string; meta?: string }[]; currency?: Currency; formatter?: (value: number) => string }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, index) => (
        <li key={item.name} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color ?? PALETTE[index % PALETTE.length] }} />
            <span className="truncate">{item.name}</span>
            {item.meta ? <span className="text-xs text-muted-foreground">{item.meta}</span> : null}
          </span>
          <span className="shrink-0 font-medium tabular">{formatter ? formatter(item.value) : currency ? formatMoney(item.value, currency) : item.value}</span>
        </li>
      ))}
    </ul>
  );
}

export { PALETTE };
