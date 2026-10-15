import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientDetailView } from "@/components/clients/client-detail";
import { requireUser } from "@/lib/auth/dal";
import { getClientDetail } from "@/lib/queries/clients";
import { isUuid } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Client" };
  const user = await requireUser();
  const client = await getClientDetail(user, id);
  return { title: client ? (client.company ?? client.name) : "Client" };
}

export default async function ClientPage({ params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const client = await getClientDetail(user, id);
  if (!client) notFound();
  return <ClientDetailView client={client} baseCurrency={user.baseCurrency} />;
}
