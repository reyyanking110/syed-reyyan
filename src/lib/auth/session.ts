import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { SESSION_COOKIE, SESSION_DURATION_DAYS } from "@/lib/constants";

const SESSION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
// Sessions are silently renewed when less than half of their lifetime remains.
const RENEW_THRESHOLD_MS = SESSION_MS / 2;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

async function requestMeta() {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    return {
      userAgent: headerStore.get("user-agent")?.slice(0, 255) ?? null,
      ipAddress: (forwarded ? forwarded.split(",")[0] : headerStore.get("x-real-ip"))?.trim().slice(0, 64) ?? null,
    };
  } catch {
    return { userAgent: null, ipAddress: null };
  }
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const meta = await requestMeta();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });
  await setSessionCookie(token, expiresAt);
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export type SessionValidationResult = { user: User; sessionId: string; expiresAt: Date } | null;

/** Validates the session token found in the request cookie. Does not redirect. */
export async function validateSessionFromCookies(): Promise<SessionValidationResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) return null;

  // Sliding expiration: extend the session when it is past the half-life.
  if (row.session.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + SESSION_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, row.session.id));
    try {
      await setSessionCookie(token, expiresAt);
    } catch {
      // Cookies can only be written from Server Actions / Route Handlers; ignore in RSC.
    }
    return { user: row.user, sessionId: row.session.id, expiresAt };
  }

  return { user: row.user, sessionId: row.session.id, expiresAt: row.session.expiresAt };
}

export async function invalidateSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function invalidateCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  await clearSessionCookie();
}

/** Opportunistic cleanup of expired sessions; cheap enough to run on login. */
export async function purgeExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
