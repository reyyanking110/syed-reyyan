"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import {
  BarChart3,
  Bell,
  Briefcase,
  CheckCheck,
  CheckSquare,
  ChevronsUpDown,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Orbit,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, Kbd } from "@/components/ui/primitives";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SheetContent,
} from "@/components/ui/overlays";
import { logoutAction } from "@/lib/actions/auth";
import { markAllNotificationsReadAction, markNotificationReadAction, searchAction } from "@/lib/actions/notifications";
import type { SearchResult } from "@/lib/queries/search";
import type { NotificationItem } from "@/lib/types";
import type { SafeUser } from "@/lib/auth/dal";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

type ShellProps = {
  user: SafeUser;
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
};

/* --------------------------------- Logo ----------------------------------- */

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-white shadow-md shadow-indigo-500/25">
        <Orbit className="size-4.5" />
      </span>
      {compact ? null : <span className="text-[1.05rem] font-semibold tracking-tight">SkillOrbit</span>}
    </Link>
  );
}

/* -------------------------------- Sidebar --------------------------------- */

function SidebarNav({ user, onNavigate }: { user: SafeUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
                active ? "bg-sidebar-accent text-primary dark:text-accent-foreground" : "text-sidebar-foreground/75 hover:bg-muted hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active ? <span className="absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" /> : null}
              <item.icon className={cn("size-[18px] transition-transform group-hover:scale-105", active ? "text-primary dark:text-accent-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 p-4">
          <Sparkles className="absolute -top-2 -right-2 size-16 text-primary/10" />
          <p className="text-sm font-semibold">Public portfolio</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Share your work with a single link.</p>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link href={`/p/${user.username}`} target="_blank" onClick={onNavigate}>
              <Globe /> View page
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** True after hydration — avoids theme/icon mismatches without a setState-in-effect. */
function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/* ------------------------------ Theme toggle ------------------------------ */

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {mounted && theme === "dark" ? <Moon /> : mounted && theme === "light" ? <Sun /> : <Monitor />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------ Notifications ----------------------------- */

const TYPE_ICON: Record<NotificationItem["type"], React.ReactNode> = {
  info: <Bell className="size-4" />,
  success: <Sparkles className="size-4" />,
  warning: <Zap className="size-4" />,
  invoice: <FileText className="size-4" />,
  payment: <CreditCard className="size-4" />,
  task: <CheckSquare className="size-4" />,
  project: <FolderKanban className="size-4" />,
  client: <Users className="size-4" />,
};

export function NotificationsMenu({ notifications, unreadCount }: { notifications: NotificationItem[]; unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [optimistic, setOptimistic] = React.useOptimistic(notifications, (state, id: string | "all") =>
    state.map((n) => (id === "all" || n.id === id ? { ...n, readAt: n.readAt ?? new Date() } : n)),
  );
  const [, startTransition] = React.useTransition();
  const unread = optimistic.filter((n) => !n.readAt).length;

  const markAll = () =>
    startTransition(async () => {
      setOptimistic("all");
      const result = await markAllNotificationsReadAction();
      if (!result.ok) toast.error(result.error);
    });

  const openItem = (n: NotificationItem) => {
    setOpen(false);
    startTransition(async () => {
      if (!n.readAt) {
        setOptimistic(n.id);
        await markNotificationReadAction(n.id);
      }
      if (n.href) router.push(n.href);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
          <Bell />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p>
          </div>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAll}>
              <CheckCheck /> Mark all read
            </Button>
          ) : null}
        </div>
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto">
          {optimistic.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul className="divide-y">
              {optimistic.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/60", !n.readAt && "bg-primary/[0.04]")}>
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", n.readAt ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>{TYPE_ICON[n.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("line-clamp-1 text-sm", n.readAt ? "font-medium text-foreground/80" : "font-semibold")}>{n.title}</span>
                        {!n.readAt ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : null}
                      </span>
                      {n.body ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span> : null}
                      <span className="mt-1 block text-[11px] text-muted-foreground/80">{formatRelative(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-4 py-2.5 text-center">
          <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------- User menu -------------------------------- */

export function UserMenu({ user, compact }: { user: SafeUser; compact?: boolean }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn("flex cursor-pointer items-center gap-2 rounded-xl p-1 transition hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none", !compact && "pr-2")} aria-label="Account menu">
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          {compact ? null : (
            <>
              <span className="hidden max-w-[9rem] flex-col items-start leading-tight md:flex">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">{user.profession}</span>
              </span>
              <ChevronsUpDown className="hidden size-3.5 text-muted-foreground md:block" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs">{user.isGuest ? "Guest workspace" : user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User /> Profile & settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/p/${user.username}`} target="_blank">
            <Globe /> Public portfolio
          </Link>
        </DropdownMenuItem>
        {user.isGuest ? (
          <DropdownMenuItem asChild>
            <Link href="/settings?tab=account">
              <Sparkles /> Save this workspace
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={pending} onSelect={(e) => { e.preventDefault(); startTransition(() => logoutAction()); }}>
          <LogOut /> {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------ Command menu ------------------------------ */

const RESULT_ICON: Record<SearchResult["type"], React.ReactNode> = {
  client: <Users className="size-4" />,
  project: <FolderKanban className="size-4" />,
  task: <CheckSquare className="size-4" />,
  invoice: <FileText className="size-4" />,
  portfolio: <Briefcase className="size-4" />,
};

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const trimmed = query.trim();
  const active = trimmed.length >= 2;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery("");
      setResults([]);
    }
    onOpenChange(next);
  };

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAction(trimmed);
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, trimmed]);

  const visibleResults = active ? results : [];

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  const grouped = visibleResults.reduce<Record<string, SearchResult[]>>((acc, result) => {
    (acc[result.type] ??= []).push(result);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md" hideClose className="top-[12%] translate-y-0 p-0">
        <DialogTitle className="sr-only">Search and quick actions</DialogTitle>
        <Command shouldFilter={false} label="Global search" className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input value={query} onValueChange={setQuery} placeholder="Search clients, projects, tasks, invoices…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
            {loading ? <div className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</div> : null}
            {!loading && query.trim().length >= 2 && results.length === 0 ? <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">No results for “{query}”.</Command.Empty> : null}
            {Object.entries(grouped).map(([type, items]) => (
              <Command.Group key={type} heading={`${type.charAt(0).toUpperCase()}${type.slice(1)}s`} className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                {items.map((item) => (
                  <Command.Item key={`${item.type}-${item.id}`} value={`${item.type}-${item.id}`} onSelect={() => go(item.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-muted">
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">{RESULT_ICON[item.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      {item.subtitle ? <span className="block truncate text-xs text-muted-foreground capitalize">{item.subtitle}</span> : null}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
            {query.trim().length < 2 ? (
              <>
                <Command.Group heading="Quick actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                  {[
                    { label: "New invoice", href: "/invoices/new", icon: <FileText className="size-4" /> },
                    { label: "New client", href: "/clients?new=1", icon: <Users className="size-4" /> },
                    { label: "New project", href: "/projects?new=1", icon: <FolderKanban className="size-4" /> },
                    { label: "New task", href: "/tasks?new=1", icon: <CheckSquare className="size-4" /> },
                  ].map((action) => (
                    <Command.Item key={action.href} value={action.label} onSelect={() => go(action.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-muted">
                      <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Plus className="size-4" />
                      </span>
                      {action.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                  {NAV_ITEMS.map((item) => (
                    <Command.Item key={item.href} value={item.label} onSelect={() => go(item.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-muted">
                      <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <item.icon className="size-4" />
                      </span>
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            ) : null}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Shell ---------------------------------- */

export function AppShell({ user, notifications, unreadCount, children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [openedAtPath, setOpenedAtPath] = React.useState(pathname);
  if (mobileOpen && openedAtPath !== pathname) {
    // Route changed while the drawer was open — close it (state adjustment during render, no effect needed).
    setMobileOpen(false);
    setOpenedAtPath(pathname);
  }

  const section = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 border-r bg-sidebar lg:block">
        <SidebarNav user={user} />
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0">
          <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => { setOpenedAtPath(pathname); setMobileOpen(true); }} aria-label="Open navigation">
            <Menu />
          </Button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <span className="font-medium text-foreground">{section?.label ?? "Workspace"}</span>
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden h-9 w-64 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition hover:bg-muted md:flex"
              aria-label="Open search"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Search…</span>
              <Kbd>⌘K</Kbd>
            </button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCommandOpen(true)} aria-label="Search">
              <Search />
            </Button>
            <Button asChild variant="gradient" size="sm" className="hidden sm:inline-flex">
              <Link href="/invoices/new">
                <Plus /> New invoice
              </Link>
            </Button>
            <ThemeToggle />
            <NotificationsMenu notifications={notifications} unreadCount={unreadCount} />
            <UserMenu user={user} />
          </div>
        </header>

        {user.isGuest ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> You&apos;re exploring a guest workspace with demo data.
            </span>
            <Link href="/settings?tab=account" className="underline underline-offset-2 hover:opacity-90">
              Add your email &amp; password to keep it →
            </Link>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
