"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, ExternalLink, Eye, EyeOff, GitBranch, Globe, Images, MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PortfolioFormDialog } from "@/components/portfolio/portfolio-form";
import { ClearFilters, ConfirmDialog, FilterChips, SearchInput, useAction } from "@/components/shared/client-utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Switch } from "@/components/ui/overlays";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { deletePortfolioItemAction, togglePortfolioFlagAction } from "@/lib/actions/portfolio";
import { setPortfolioPublicAction } from "@/lib/actions/settings";
import type { PortfolioItem } from "@/db/schema";
import { formatDate } from "@/lib/dates";
import type { ClientOption, PortfolioListItem, ProjectOption } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { items: PortfolioListItem[]; clients: ClientOption[]; projects: ProjectOption[]; categories: string[]; username: string | null; portfolioPublic: boolean; appUrl: string; hasFilters: boolean };

export function PortfolioView({ items, clients, projects, categories, username, portfolioPublic, appUrl, hasFilters }: Props) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PortfolioItem | null>(null);
  const [deleting, setDeleting] = React.useState<PortfolioItem | null>(null);
  const [isPublic, setPublicOptimistic] = React.useOptimistic(portfolioPublic);
  const [, startTransition] = React.useTransition();
  const { run, pending } = useAction();
  const [optimistic, applyOptimistic] = React.useOptimistic(items, (state, update: { id: string; patch?: Partial<PortfolioItem>; remove?: boolean }) =>
    update.remove ? state.filter((i) => i.id !== update.id) : state.map((i) => (i.id === update.id ? { ...i, ...update.patch } : i)),
  );
  const publicUrl = username ? `${appUrl}/p/${username}` : null;
  const publicCount = items.filter((i) => i.visibility === "public").length;

  const toggleVisibility = (item: PortfolioItem) =>
    startTransition(async () => {
      const next = item.visibility === "public" ? "private" : "public";
      applyOptimistic({ id: item.id, patch: { visibility: next } });
      const result = await togglePortfolioFlagAction(item.id, "visibility", next === "public");
      if (!result.ok) toast.error(result.error);
    });
  const toggleFeatured = (item: PortfolioItem) =>
    startTransition(async () => {
      applyOptimistic({ id: item.id, patch: { featured: !item.featured } });
      const result = await togglePortfolioFlagAction(item.id, "featured", !item.featured);
      if (!result.ok) toast.error(result.error);
    });
  const togglePublicProfile = (checked: boolean) =>
    startTransition(async () => {
      setPublicOptimistic(checked);
      const result = await setPortfolioPublicAction(checked);
      if (!result.ok) toast.error(result.error);
      else toast.success(checked ? "Public profile enabled" : "Public profile disabled");
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description={`${items.length} item${items.length === 1 ? "" : "s"} · ${publicCount} public`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus /> Add work
          </Button>
        }
      />

      <Card className="flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", isPublic ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
            <Globe className="size-5" />
          </span>
          <div>
            <p className="font-medium">Public profile {isPublic ? "is live" : "is off"}</p>
            {publicUrl ? (
              <p className="text-sm text-muted-foreground">
                {isPublic ? "Share your work at " : "When enabled, it will be at "}
                <span className="font-mono text-xs">{publicUrl.replace(/^https?:\/\//, "")}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set a username in{" "}
                <Link href="/settings?tab=profile" className="text-primary hover:underline">
                  Settings
                </Link>{" "}
                to get a shareable link.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {publicUrl ? (
            <>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(publicUrl).then(() => toast.success("Link copied"))} disabled={!isPublic}>
                <Copy /> Copy link
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/p/${username}`} target="_blank">
                  <ExternalLink /> Preview
                </Link>
              </Button>
            </>
          ) : null}
          <Switch checked={isPublic} onCheckedChange={togglePublicProfile} aria-label="Toggle public profile" disabled={!username} />
        </div>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips param="category" options={[{ value: "all", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]} />
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search portfolio…" className="w-full sm:w-60" />
          <ClearFilters keys={["q", "category"]} />
        </div>
      </div>

      {optimistic.length === 0 ? (
        <EmptyState icon={<Images />} title={hasFilters ? "Nothing matches" : "Your portfolio is empty"} description={hasFilters ? "Try another category or search." : "Add case studies, shipped products, designs — anything that shows what you can do."} action={hasFilters ? <ClearFilters keys={["q", "category"]} /> : <Button onClick={() => setFormOpen(true)}><Plus /> Add your first piece</Button>} />
      ) : (
        <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {optimistic.map((item) => (
            <Card key={item.id} className="card-hover group gap-0 overflow-hidden p-0">
              <div className="relative aspect-[16/10] overflow-hidden" style={{ background: item.gradient }}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white/30">{item.title.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {item.featured ? (
                    <Badge className="gap-1 bg-amber-400 text-amber-950 hover:bg-amber-400">
                      <Star className="size-3 fill-current" /> Featured
                    </Badge>
                  ) : null}
                  {item.visibility === "private" ? (
                    <Badge className="gap-1 bg-black/60 text-white backdrop-blur">
                      <EyeOff className="size-3" /> Private
                    </Badge>
                  ) : null}
                </div>
                <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-sm" variant="secondary" className="bg-white/90 text-foreground hover:bg-white" aria-label="Portfolio item actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onSelect={() => { setEditing(item); setFormOpen(true); }}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggleFeatured(item)}>
                        <Star /> {item.featured ? "Unfeature" : "Feature"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggleVisibility(item)}>
                        {item.visibility === "public" ? <EyeOff /> : <Eye />} {item.visibility === "public" ? "Make private" : "Make public"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{item.category}</p>
                  <h3 className="mt-0.5 line-clamp-1 font-semibold">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || "No description."}</p>
                </div>
                {item.tags.length ? (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} tone="muted">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 4 ? <Badge tone="muted">+{item.tags.length - 4}</Badge> : null}
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>{item.completedOn ? formatDate(item.completedOn) : "Date not set"}</span>
                  <span className="flex items-center gap-1">
                    {item.liveUrl ? (
                      <a href={item.liveUrl} target="_blank" rel="noreferrer" className="rounded-md p-1.5 hover:bg-muted hover:text-foreground" aria-label="Open live site">
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : null}
                    {item.repoUrl ? (
                      <a href={item.repoUrl} target="_blank" rel="noreferrer" className="rounded-md p-1.5 hover:bg-muted hover:text-foreground" aria-label="Open repository">
                        <GitBranch className="size-3.5" />
                      </a>
                    ) : null}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PortfolioFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }} item={editing} clients={clients} projects={projects} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove “${deleting?.title}”?`}
        description="It will be removed from your portfolio and public profile."
        confirmLabel="Remove"
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          const target = deleting;
          await run(deletePortfolioItemAction(target.id), { onSuccess: () => { setDeleting(null); startTransition(() => applyOptimistic({ id: target.id, remove: true })); } });
        }}
      />
    </div>
  );
}
