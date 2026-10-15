import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDetailView } from "@/components/invoices/invoice-detail";
import { requireUser } from "@/lib/auth/dal";
import { getInvoiceDetail } from "@/lib/queries/invoices";
import { isUuid } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Invoice" };
  const user = await requireUser();
  const invoice = await getInvoiceDetail(user.id, id);
  return { title: invoice?.number ?? "Invoice" };
}

export default async function InvoicePage({ params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const invoice = await getInvoiceDetail(user.id, id);
  if (!invoice) notFound();
  return <InvoiceDetailView invoice={invoice} user={{ name: user.name, businessName: user.businessName, businessAddress: user.businessAddress, email: user.email, website: user.website, taxId: user.taxId, location: user.location }} />;
}
