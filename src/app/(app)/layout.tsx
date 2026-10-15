import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser, toSafeUser } from "@/lib/auth/dal";
import { getUnreadCount, listNotifications } from "@/lib/queries/notifications";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [notifications, unreadCount] = await Promise.all([listNotifications(user.id, 12), getUnreadCount(user.id)]);

  return (
    <AppShell user={toSafeUser(user)} notifications={notifications} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
