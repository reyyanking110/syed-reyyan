import type { Metadata } from "next";
import { ClientsView } from "@/components/clients/clients-view";
import { requireUser } from "@/lib/auth/dal";
import { listClients, type ClientFilters } from "@/lib/queries/clients";

export const metadata: Metadata = { title: "Clients" };

type Search = { q?: string; status?: string; sort?: string; new?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const filters: ClientFilters = {
    q: params.q,
    status: (params.status as ClientFilters["status"]) ?? "all",
    sort: (params.sort as ClientFilters["sort"]) ?? "recent",
  };
  const hasFilters = Boolean(params.q || (params.status && params.status !== "all"));
  const [clients, all] = await Promise.all([listClients(user, filters), hasFilters ? listClients(user) : null]);
  return <ClientsView clients={clients} baseCurrency={user.baseCurrency} totalCount={(all ?? clients).length} hasFilters={hasFilters} />;
}
