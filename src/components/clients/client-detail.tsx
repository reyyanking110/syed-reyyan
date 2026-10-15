"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, ExternalLink, FileText, FolderKanban, Globe, Mail, MapPin, Pencil, Phone, Plus, Trash2, Wallet } from "lucide-react";
import { ClientFormDialog } from "@/components/clients/client-form";
import { ConfirmDialog, useAction } from "@/components/shared/client-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { deleteClientAction } from "@/lib/actions/clients";
import { PAYMENT_METHOD } from "@/lib/constants";
import type { Currency } from "@/db/schema";
import { formatDate, formatRelative } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ClientDetail } from "@/lib/queries/clients";
import { percent, toNumber } from "@/lib/utils";

export function ClientDetailView({ client, baseCurrency }: { client: ClientDetail; baseCurrency: Currency }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { run, pending } = useAction();

  const title = client.company ?? client.name;

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="size-4" /> Clients
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={title} color={client.color} size="xl" className="rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <StatusBadge kind="client" status={client.status} />
              <Badge tone="outline">{client.currency}</Badge>
            </div>
            {client.company ? <p className="text-sm text-muted-foreground">{client.name}</p> : null}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {client.email ? (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Mail className="size-3.5" /> {client.email}
                </a>
              ) : null}
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="size-3.5" /> {client.phone}
                </a>
              ) : null}
              {client.website ? (
                <a href={client.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Globe className="size-3.5" /> {client.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
              {client.city || client.country ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {[client.city, client.country].filter(Boolean).join(", ")}
                </span>
              ) : null}
            </div>
            {client.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {client.tags.map((tag) => (
                  <Badge key={tag} tone="muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/projects?new=1&client=${client.id}`}>
              <FolderKanban /> Project
            </Link>
          </Button>
          <Button asChild variant="gradient">
            <Link href={`/invoices/new?client=${client.id}`}>
              <Plus /> Invoice
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit client">
            <Pencil />
          </Button>
          <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)} aria-label="Delete client">
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Lifetime billed", value: formatMoney(client.stats.billed, baseCurrency, { noDecimals: true }), icon: FileText },
          { label: "Collected", value: formatMoney(client.stats.paid, baseCurrency, { noDecimals: true }), icon: Wallet },
          { label: "Outstanding", value: formatMoney(client.stats.outstanding, baseCurrency, { noDecimals: true }), icon: Wallet, warn: client.stats.overdue > 0 ? `${client.stats.overdue} overdue` : undefined },
          { label: "Projects", value: `${client.stats.projectCount}`, icon: FolderKanban, sub: `${client.stats.activeProjects} active` },
        ].map((stat) => (
          <Card key={stat.label} className="gap-1 px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular">{stat.value}</p>
            {stat.warn ? <p className="text-xs font-medium text-rose-600">{stat.warn}</p> : stat.sub ? <p className="text-xs text-muted-foreground">{stat.sub}</p> : <p className="text-xs text-muted-foreground">in {baseCurrency}</p>}
          </Card>
        ))}
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects ({client.projects.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({client.invoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({client.payments.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          {client.projects.length === 0 ? (
            <EmptyState compact icon={<FolderKanban />} title="No projects yet" description="Start a project for this client to track scope and progress." action={<Button asChild size="sm"><Link href={`/projects?new=1&client=${client.id}`}><Plus /> New project</Link></Button>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {client.projects.map((project) => {
                const done = project.tasks.filter((t) => t.status === "done").length;
                const progress = project.status === "completed" ? 100 : percent(done, project.tasks.length);
                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="card-hover rounded-2xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="size-2.5 rounded-full" style={{ background: project.color }} />
                        {project.name}
                      </p>
                      <StatusBadge kind="project" status={project.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.description ?? "No description"}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={progress} color={project.color} size="sm" className="flex-1" />
                      <span className="text-xs tabular text-muted-foreground">{done}/{project.tasks.length} tasks</span>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>{project.budget ? formatMoney(project.budget, project.currency, { noDecimals: true }) : "No budget"}</span>
                      <span>{project.dueDate ? `Due ${formatDate(project.dueDate)}` : "No deadline"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {client.invoices.length === 0 ? (
            <EmptyState compact icon={<FileText />} title="No invoices yet" description="Bill this client for your work." action={<Button asChild size="sm"><Link href={`/invoices/new?client=${client.id}`}><Plus /> New invoice</Link></Button>} />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.invoices.map((invoice) => {
                    const balance = toNumber(invoice.total) - toNumber(invoice.amountPaid);
                    return (
                      <TableRow key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell className="text-muted-foreground">{invoice.project?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <StatusBadge kind="invoice" status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular">{formatMoney(invoice.total, invoice.currency)}</TableCell>
                        <TableCell className="text-right tabular">{balance > 0 && invoice.status !== "draft" && invoice.status !== "cancelled" ? formatMoney(balance, invoice.currency) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {client.payments.length === 0 ? (
            <EmptyState compact icon={<Wallet />} title="No payments recorded" description="Payments appear here when you record them against invoices." />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paidAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{PAYMENT_METHOD[payment.method]}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.reference ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium tabular text-emerald-600 dark:text-emerald-400">+{formatMoney(payment.amount, payment.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" /> Notes & details
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[1fr_16rem]">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{client.notes || <span className="text-muted-foreground">No notes yet. Add context about this client — how they like to communicate, payment preferences, and more.</span>}</p>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Address</dt>
                  <dd>{client.address ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Client since</dt>
                  <dd>{formatDate(client.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Last updated</dt>
                  <dd>{formatRelative(client.updatedAt)}</dd>
                </div>
                {client.website ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Website</dt>
                    <dd>
                      <a href={client.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {client.website.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${title}?`}
        description={client.invoices.length ? `This client has ${client.invoices.length} invoice(s). Delete or reassign them first, or mark the client as inactive.` : "Projects linked to this client will be kept but unassigned. This cannot be undone."}
        confirmLabel="Delete client"
        pending={pending}
        onConfirm={() => run(deleteClientAction(client.id), { onSuccess: () => router.push("/clients") })}
      />
    </div>
  );
}
