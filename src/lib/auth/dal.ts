import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@/db/schema";
import { validateSessionFromCookies } from "./session";

/**
 * Data-access-layer helpers. `getCurrentUser` is memoised per request so layouts,
 * pages and server actions can all call it without duplicate queries.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const result = await validateSessionFromCookies();
  return result?.user ?? null;
});

export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export type SafeUser = Omit<User, "passwordHash">;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}
