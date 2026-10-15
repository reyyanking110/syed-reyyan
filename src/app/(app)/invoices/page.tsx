import type { Metadata } from "next";
import { InvoicesView } from "@/components/invoices/invoices-view";
import { requireUser } from "@/lib/auth/dal";
import { getClientOptions } from "@/lib/queries/clients";
import { getInvoiceSummary, listInvoices, type InvoiceFilters } from "@/lib/queries/invoices";

export const metadata: Metadata = { title: "Invoices" };

type Search = { q?: string; status?: string; client?: string; sort?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const filters: InvoiceFilters = {
    q: params.q,
    status: (params.status as InvoiceFilters["status"]) ?? "all",
    clientId: params.client && params.client !== "all" ? params.client : undefined,
    sort: (params.sort as InvoiceFilters["sort"]) ?? "recent",
  };
  const hasFilters = Boolean(params.q || (params.status && params.status !== "all") || filters.clientId);
  const [invoices, clients, summary] = await Promise.all([listInvoices(user, filters), getClientOptions(user.id), getInvoiceSummary(user)]);
  return <InvoicesView invoices={invoices} clients={clients} summary={summary} baseCurrency={user.baseCurrency} hasFilters={hasFilters} />;
}
