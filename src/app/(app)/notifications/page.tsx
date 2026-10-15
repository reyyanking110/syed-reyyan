import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { requireUser } from "@/lib/auth/dal";
import { listNotifications } from "@/lib/queries/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const notifications = await listNotifications(user.id, 100);
  return <NotificationsView notifications={notifications} filter={params.filter === "unread" ? "unread" : "all"} />;
}
