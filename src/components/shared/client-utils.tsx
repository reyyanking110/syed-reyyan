"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/primitives";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import type { ActionResult } from "@/lib/validations";
import { cn } from "@/lib/utils";

/* ------------------------------ URL filter hooks --------------------------- */

export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const setParams = React.useCallback(
    (updates: Record<string, string | null | undefined>, options: { replace?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "" || value === "all") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        if (options.replace) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return { searchParams, setParams, isPending };
}

export function SearchInput({ placeholder = "Search…", param = "q", className, autoFocus }: { placeholder?: string; param?: string; className?: string; autoFocus?: boolean }) {
  const { searchParams, setParams, isPending } = useUrlParams();
  const current = searchParams.get(param) ?? "";
  const [value, setValue] = React.useState(current);
  const [syncedFrom, setSyncedFrom] = React.useState(current);
  if (current !== syncedFrom) {
    // URL changed from outside (back/forward, clear filters) — adopt it without an effect.
    setSyncedFrom(current);
    setValue(current);
  }

  React.useEffect(() => {
    if (value === current) return;
    const timer = setTimeout(() => setParams({ [param]: value.trim() || null }, { replace: true }), 300);
    return () => clearTimeout(timer);
  }, [value, current, param, setParams]);

  return (
    <div className={cn("relative", className)}>
      <Search className={cn("pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground", isPending && "animate-pulse text-primary")} />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="pl-9 pr-8" autoFocus={autoFocus} aria-label={placeholder} />
      {value ? (
        <button type="button" onClick={() => setValue("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({ param, options, label, className, defaultValue = "all" }: { param: string; options: { value: string; label: string }[]; label?: string; className?: string; defaultValue?: string }) {
  const { searchParams, setParams } = useUrlParams();
  const current = searchParams.get(param) ?? defaultValue;
  return (
    <NativeSelect value={current} onChange={(e) => setParams({ [param]: e.target.value })} aria-label={label ?? param} className={cn("w-auto min-w-[8.5rem]", className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function FilterChips({ param, options, defaultValue = "all" }: { param: string; options: { value: string; label: string; count?: number }[]; defaultValue?: string }) {
  const { searchParams, setParams } = useUrlParams();
  const current = searchParams.get(param) ?? defaultValue;
  return (
    <div className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {options.map((option) => {
        const active = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setParams({ [param]: option.value })}
            className={cn(
              "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-all",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={active}
          >
            {option.label}
            {option.count !== undefined ? <span className={cn("rounded-full px-1.5 text-[11px] tabular", active ? "bg-primary/10 text-primary" : "bg-background/60")}>{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ClearFilters({ keys }: { keys: string[] }) {
  const { searchParams, setParams } = useUrlParams();
  const active = keys.some((key) => searchParams.has(key));
  if (!active) return null;
  return (
    <Button variant="ghost" size="sm" onClick={() => setParams(Object.fromEntries(keys.map((key) => [key, null])))}>
      <X /> Clear
    </Button>
  );
}

/* ------------------------------- Action runner ----------------------------- */

export function useAction() {
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  const run = React.useCallback(
    async <T,>(
      promise: Promise<ActionResult<T>>,
      options: { success?: string | ((data: T) => string); onSuccess?: (data: T) => void; onError?: (result: Extract<ActionResult<T>, { ok: false }>) => void; silent?: boolean; refresh?: boolean } = {},
    ) => {
      setPending(true);
      try {
        const result = await promise;
        if (result.ok) {
          const message = typeof options.success === "function" ? options.success(result.data) : (options.success ?? result.message);
          if (message && !options.silent) toast.success(message);
          options.onSuccess?.(result.data);
          if (options.refresh) router.refresh();
        } else {
          if (!options.silent) toast.error(result.error);
          options.onError?.(result);
        }
        return result;
      } catch (error) {
        // Server actions that redirect throw a special error that Next handles; swallow everything else.
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
        const message = "Something went wrong. Please try again.";
        toast.error(message);
        return { ok: false, error: message } as ActionResult<T>;
      } finally {
        setPending(false);
      }
    },
    [router],
  );

  return { run, pending };
}

/* ------------------------------- Confirm dialog ---------------------------- */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => unknown;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
              <AlertTriangle className="size-4" />
            </span>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{description ?? "This action cannot be undone."}</DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={() => void onConfirm()} loading={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- Misc ----------------------------------- */

export function CopyButton({ text, label = "Copy link", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Could not copy");
        }
      }}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
}

export function TagsInput({ value, onChange, placeholder = "Add a tag and press Enter", suggestions }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string; suggestions?: readonly string[] }) {
  const [draft, setDraft] = React.useState("");
  const listId = React.useId();
  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "");
    if (!tag || value.includes(tag) || value.length >= 12) return;
    onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25 dark:bg-input/20">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded hover:text-destructive" aria-label={`Remove ${tag}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={suggestions ? listId : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
      />
      {suggestions ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
