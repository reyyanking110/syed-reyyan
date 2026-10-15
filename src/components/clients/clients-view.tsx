"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Mail, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { ClientFormDialog } from "@/components/clients/client-form";
import { ClearFilters, ConfirmDialog, FilterSelect, SearchInput, useAction } from "@/components/shared/client-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Avatar, Badge, Card, EmptyState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { deleteClientAction, updateClientStatusAction } from "@/lib/actions/clients";
import { CLIENT_STATUS } from "@/lib/constants";
import type { Client, ClientStatus, Currency } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import type { ClientListItem } from "@/lib/types";

type Props = { clients: ClientListItem[]; baseCurrency: Currency; totalCount: number; hasFilters: boolean };

export function ClientsView({ clients, baseCurrency, totalCount, hasFilters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsNew = searchParams.get("new") === "1";
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [deleting, setDeleting] = React.useState<ClientListItem | null>(null);
  const { run, pending } = useAction();
  const [optimistic, applyOptimistic] = React.useOptimistic(clients, (state, update: { id: string; status?: ClientStatus; remove?: boolean }) =>
    update.remove ? state.filter((c) => c.id !== update.id) : state.map((c) => (c.id === update.id ? { ...c, status: update.status ?? c.status } : c)),
  );
  const [, startTransition] = React.useTransition();

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    if (wantsNew) window.history.replaceState(null, "", "/clients");
  };

  const changeStatus = (client: ClientListItem, status: ClientStatus) =>
    startTransition(async () => {
      applyOptimistic({ id: client.id, status });
      const result = await updateClientStatusAction(client.id, status);
      if (!result.ok) toast.error(result.error);
    });

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    await run(deleteClientAction(target.id), {
      onSuccess: () => {
        setDeleting(null);
        startTransition(() => applyOptimistic({ id: target.id, remove: true }));
      },
    });
  };

  const stats = {
    active: clients.filter((c) => c.status === "active").length,
    leads: clients.filter((c) => c.status === "lead").length,
    outstanding: clients.reduce((sum, c) => sum + c.outstandingBase, 0),
    billed: clients.reduce((sum, c) => sum + c.totalBilledBase, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description={`${totalCount} client${totalCount === 1 ? "" : "s"} · ${stats.active} active · ${stats.leads} leads`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus /> New client
          </Button>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-3">
        {[
          { label: "Lifetime billed", value: formatMoney(stats.billed, baseCurrency, { noDecimals: true }), hint: "Across listed clients" },
          { label: "Outstanding", value: formatMoney(stats.outstanding, baseCurrency, { noDecimals: true }), hint: "Unpaid invoices" },
          { label: "Active relationships", value: String(stats.active), hint: `${stats.leads} lead${stats.leads === 1 ? "" : "s"} in pipeline` },
        ].map((stat) => (
          <Card key={stat.label} className="gap-1 px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search name, company, email…" className="w-full sm:w-72" />
        <FilterSelect param="status" label="Status" options={[{ value: "all", label: "All statuses" }, ...Object.entries(CLIENT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))]} />
        <FilterSelect param="sort" label="Sort" defaultValue="recent" options={[{ value: "recent", label: "Recently updated" }, { value: "name", label: "Name A–Z" }, { value: "billed", label: "Most billed" }]} />
        <ClearFilters keys={["q", "status", "sort"]} />
      </div>

      {optimistic.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={hasFilters ? "No clients match your filters" : "No clients yet"}
          description={hasFilters ? "Try a different search or clear the filters." : "Add the people and companies you work with to start tracking projects and invoices."}
          action={hasFilters ? <ClearFilters keys={["q", "status", "sort"]} /> : <Button onClick={() => setFormOpen(true)}><Plus /> Add your first client</Button>}
        />
      ) : (
        <>
          <Card className="hidden gap-0 overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimistic.map((client) => (
                  <TableRow key={client.id} className="group cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={client.company ?? client.name} color={client.color} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{client.company ?? client.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{client.company ? client.name : client.email ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge kind="client" status={client.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{[client.city, client.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell className="text-right tabular">
                      {client.projectCount}
                      {client.activeProjectCount ? <span className="text-xs text-muted-foreground"> · {client.activeProjectCount} active</span> : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular">{formatMoney(client.totalBilledBase, baseCurrency, { noDecimals: true })}</TableCell>
                    <TableCell className="text-right tabular">
                      {client.outstandingBase > 0 ? <span className="font-medium text-amber-600 dark:text-amber-400">{formatMoney(client.outstandingBase, baseCurrency, { noDecimals: true })}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RowMenu client={client} onEdit={() => { setEditing(client); setFormOpen(true); }} onDelete={() => setDeleting(client)} onStatus={(status) => changeStatus(client, status)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="stagger grid gap-3 md:hidden">
            {optimistic.map((client) => (
              <Card key={client.id} className="gap-3 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Avatar name={client.company ?? client.name} color={client.color} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/clients/${client.id}`} className="block truncate font-medium hover:underline">
                      {client.company ?? client.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{client.company ? client.name : client.email}</p>
                  </div>
                  <RowMenu client={client} onEdit={() => { setEditing(client); setFormOpen(true); }} onDelete={() => setDeleting(client)} onStatus={(status) => changeStatus(client, status)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusBadge kind="client" status={client.status} />
                  <Badge tone="outline">{client.projectCount} projects</Badge>
                  <span className="ml-auto font-semibold tabular">{formatMoney(client.totalBilledBase, baseCurrency, { noDecimals: true })}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ClientFormDialog open={formOpen || wantsNew} onOpenChange={(open) => (open ? setFormOpen(true) : closeForm())} client={editing} defaultCurrency={baseCurrency} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.company ?? deleting?.name}?`}
        description={deleting?.invoiceCount ? `This client has ${deleting.invoiceCount} invoice(s). Delete or reassign them first, or mark the client as inactive.` : "Projects linked to this client will be kept but unassigned. This cannot be undone."}
        confirmLabel="Delete client"
        pending={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function RowMenu({ client, onEdit, onDelete, onStatus }: { client: ClientListItem; onEdit: () => void; onDelete: () => void; onStatus: (status: ClientStatus) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Client actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/clients/${client.id}`}>
            <ExternalLink /> Open
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Edit
        </DropdownMenuItem>
        {client.email ? (
          <DropdownMenuItem asChild>
            <a href={`mailto:${client.email}`}>
              <Mail /> Email
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={client.status} onValueChange={(value) => onStatus(value as ClientStatus)}>
          {Object.entries(CLIENT_STATUS).map(([value, meta]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {meta.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
