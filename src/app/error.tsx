"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground antialiased">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
            <AlertTriangle className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred. You can try again, and if the problem persists, reload the page.</p>
          {error.digest ? <p className="mt-2 font-mono text-[11px] text-muted-foreground">Ref: {error.digest}</p> : null}
          <button type="button" onClick={reset} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90">
            <RotateCcw className="size-4" /> Try again
          </button>
        </div>
      </body>
    </html>
  );
}
