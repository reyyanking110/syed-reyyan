import "server-only";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/validations";

/**
 * All application routes are dynamic and user-scoped, so after a mutation we revalidate the
 * root layout: the current route re-renders inside the action response and the client router
 * cache is refreshed everywhere (topbar badges, dashboard KPIs, detail pages…).
 */
export function revalidateApp(...paths: string[]) {
  revalidatePath("/", "layout");
  for (const path of paths) revalidatePath(path);
}

export function failure(error: unknown, fallback: string): ActionResult<never> {
  if (process.env.NODE_ENV !== "production") console.error(fallback, error);
  else console.error(fallback, error instanceof Error ? error.message : error);
  const message = error instanceof KnownError ? error.message : fallback;
  return { ok: false, error: message };
}

/** Error whose message is safe to show to the end user. */
export class KnownError extends Error {}
