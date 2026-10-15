import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { requireUser } from "@/lib/auth/dal";
import { getClientOptions } from "@/lib/queries/clients";
import { getInvoiceDetail, getNextInvoiceSequence } from "@/lib/queries/invoices";
import { getProjectOptions } from "@/lib/queries/projects";
import { isUuid } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Edit invoice" };
  const user = await requireUser();
  const invoice = await getInvoiceDetail(user.id, id);
  return { title: invoice ? `Edit ${invoice.number}` : "Edit invoice" };
}

export default async function EditInvoicePage({ params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const [invoice, clients, projects, nextNumber] = await Promise.all([getInvoiceDetail(user.id, id), getClientOptions(user.id), getProjectOptions(user.id), getNextInvoiceSequence(user.id).then((seq) => `${user.invoicePrefix}-${String(seq).padStart(4, "0")}`)]);
  if (!invoice) notFound();
  if (invoice.status === "paid") redirect(`/invoices/${invoice.id}`);
  return (
    <InvoiceEditor
      invoice={invoice}
      clients={clients}
      projects={projects}
      defaults={{
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
