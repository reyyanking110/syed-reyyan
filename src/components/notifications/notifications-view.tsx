"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, FolderKanban, Info, Receipt, Trash2, UserRound, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog, FilterChips, useAction } from "@/components/shared/client-utils";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { deleteNotificationAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { formatRelative } from "@/lib/dates";
import type { NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotificationsView({ notifications, filter }: { notifications: NotificationItem[]; filter: "all" | "unread" }) {
  const { run, pending } = useAction();
  const [deleting, setDeleting] = React.useState<NotificationItem | null>(null);
  const [, startTransition] = React.useTransition();
  const [optimistic, applyOptimistic] = React.useOptimistic(notifications, (state, update: { id?: string; all?: boolean; remove?: boolean }) =>
    update.remove ? state.filter((n) => n.id !== update.id) : state.map((n) => (update.all || n.id === update.id ? { ...n, readAt: n.readAt ?? new Date() } : n)),
  );
  const unread = optimistic.filter((n) => !n.readAt).length;
  const visible = filter === "unread" ? optimistic.filter((n) => !n.readAt) : optimistic;

  const markRead = (id: string) =>
    startTransition(async () => {
      applyOptimistic({ id });
      const result = await markNotificationReadAction(id);
      if (!result.ok) toast.error(result.error);
    });
  const markAll = () =>
    startTransition(async () => {
      applyOptimistic({ all: true });
      const result = await markAllNotificationsReadAction();
      if (!result.ok) toast.error(result.error);
      else toast.success("All caught up");
    });

  const groups = groupByDay(visible);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up"}
        actions={
          <>
            <Button variant="outline" onClick={markAll} disabled={!unread}>
              <CheckCheck /> Mark all read
            </Button>
          </>
        }
      />
      <FilterChips param="filter" options={[{ value: "all", label: "All", count: optimistic.length }, { value: "unread", label: "Unread", count: unread }]} />

      {visible.length === 0 ? (
        <EmptyState icon={<Bell />} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} description="We'll let you know about overdue invoices, payments, due tasks and more." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
              <Card className="gap-0 overflow-hidden p-0">
                <ul className="divide-y">
                  {group.items.map((item) => {
                    const content = (
                      <>
                        <NotificationIcon type={item.type} />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm", !item.readAt && "font-semibold")}>{item.title}</p>
                          {item.body ? <p className="line-clamp-2 text-sm text-muted-foreground">{item.body}</p> : null}
                          <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(item.createdAt)}</p>
                        </div>
                        {!item.readAt ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                      </>
                    );
                    const className = cn("flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/40", !item.readAt && "bg-primary/[0.03]");
                    return (
                      <li key={item.id} className="group flex items-stretch">
                        {item.href ? (
                          <Link href={item.href} className={className} onClick={() => !item.readAt && markRead(item.id)}>
                            {content}
                          </Link>
                        ) : (
                          <button type="button" className={className} onClick={() => !item.readAt && markRead(item.id)}>
                            {content}
                          </button>
                        )}
                        <button type="button" onClick={() => setDeleting(item)} className="flex items-center px-3 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100 focus:opacity-100" aria-label="Delete notification">
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this notification?"
        description={deleting?.title}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          const target = deleting;
          await run(deleteNotificationAction(target.id), { onSuccess: () => { setDeleting(null); startTransition(() => applyOptimistic({ id: target.id, remove: true })); } });
        }}
      />
    </div>
  );
}

function groupByDay(items: NotificationItem[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const buckets = new Map<string, NotificationItem[]>();
  for (const item of items) {
    const date = new Date(item.createdAt);
    const label = sameDay(date, today) ? "Today" : sameDay(date, yesterday) ? "Yesterday" : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
    buckets.set(label, [...(buckets.get(label) ?? []), item]);
  }
  return Array.from(buckets, ([label, items]) => ({ label, items }));
}

const ICONS: Record<NotificationItem["type"], { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  info: { icon: Info, className: "bg-sky-500/10 text-sky-600" },
  success: { icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600" },
  warning: { icon: AlertTriangle, className: "bg-amber-500/10 text-amber-600" },
  invoice: { icon: Receipt, className: "bg-indigo-500/10 text-indigo-600" },
  payment: { icon: Wallet, className: "bg-emerald-500/10 text-emerald-600" },
  task: { icon: CheckCircle2, className: "bg-violet-500/10 text-violet-600" },
  project: { icon: FolderKanban, className: "bg-fuchsia-500/10 text-fuchsia-600" },
  client: { icon: UserRound, className: "bg-teal-500/10 text-teal-600" },
};

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  const meta = ICONS[type] ?? ICONS.info;
  const Icon = meta.icon;
  return (
    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", meta.className)}>
      <Icon className="size-4" />
    </span>
  );
}
