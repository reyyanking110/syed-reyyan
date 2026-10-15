import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";
import { requireUser, toSafeUser } from "@/lib/auth/dal";
import { getDemoCounts } from "@/lib/queries/dashboard";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const demoCounts = await getDemoCounts(user.id);
  return <SettingsView user={toSafeUser(user)} demoCounts={demoCounts} appUrl={absoluteUrl()} />;
}
