"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertOctagon className="size-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">We couldn&apos;t load this page. Your data is safe — try again, or head back to the dashboard.</p>
      {error.digest ? <p className="mt-2 font-mono text-[11px] text-muted-foreground">Ref: {error.digest}</p> : null}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
