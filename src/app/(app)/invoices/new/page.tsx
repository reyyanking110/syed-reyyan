import type { Metadata } from "next";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { requireUser } from "@/lib/auth/dal";
import { getClientOptions } from "@/lib/queries/clients";
import { getNextInvoiceSequence } from "@/lib/queries/invoices";
import { getProjectOptions } from "@/lib/queries/projects";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client?: string; project?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [clients, projects, nextNumber] = await Promise.all([getClientOptions(user.id), getProjectOptions(user.id), getNextInvoiceSequence(user.id).then((seq) => `${user.invoicePrefix}-${String(seq).padStart(4, "0")}`)]);
  const project = params.project && isUuid(params.project) ? projects.find((p) => p.id === params.project) : undefined;
  const clientId = params.client && isUuid(params.client) && clients.some((c) => c.id === params.client) ? params.client : (project?.clientId ?? undefined);
  return (
    <InvoiceEditor
      clients={clients}
      projects={projects}
      defaults={{
        clientId,
        projectId: project?.id,
        currency: user.baseCurrency,
        taxRate: user.defaultTaxRate,
        paymentTermsDays: user.defaultPaymentTermsDays,
        notes: user.invoiceNotes ?? "",
        terms: user.paymentInstructions ?? "",
        nextNumber,
      }}
    />
  );
}
