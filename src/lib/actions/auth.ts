"use server";

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { seedDemoWorkspace } from "@/db/seed-demo";
import { users, type Currency } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIdentifier, rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { createSession, invalidateCurrentSession, purgeExpiredSessions } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { flattenErrors, loginSchema, registerSchema, type ActionResult } from "@/lib/validations";

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";

async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  return user ?? null;
}

async function usernameTaken(username: string) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
    .limit(1);
  return !!row;
}

export async function generateUsername(name: string) {
  const base = slugify(name).replace(/-+/g, "-") || "freelancer";
  let candidate = base.slice(0, 24);
  let attempts = 0;
  while (await usernameTaken(candidate)) {
    attempts += 1;
    candidate = `${base.slice(0, 20)}-${randomBytes(2).toString("hex")}`;
    if (attempts > 8) {
      candidate = `user-${randomBytes(4).toString("hex")}`;
    }
  }
  return candidate;
}

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  profession: string;
  baseCurrency: Currency;
};

async function createAccount(input: RegisterInput, options: { isGuest?: boolean } = {}) {
  const passwordHash = await hashPassword(input.password);
  const username = await generateUsername(input.name);
  const baseCurrency = input.baseCurrency;

  const user = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        name: input.name,
        username,
        profession: input.profession,
        headline: `${input.profession} · Available for new projects`,
        bio: `Hi, I'm ${input.name.split(" ")[0]} — a ${input.profession.toLowerCase()} helping clients ship great work on time. This is my SkillOrbit portfolio; edit this bio from Settings → Profile.`,
        baseCurrency,
        isGuest: options.isGuest ?? false,
        paymentInstructions:
          baseCurrency === "PKR"
            ? "Bank transfer: Meezan Bank · Account title: Your Name · IBAN: PK00 MEZN 0000 0000 0000 0000\nJazzCash / Easypaisa: +92 3XX XXXXXXX"
            : "Wise / Payoneer: your@email.com\nBank transfer details available on request.",
        invoiceNotes: "Thank you for your business! Payment is due within the terms stated above.",
        lastLoginAt: new Date(),
      })
      .returning();

    // Demo data is seeded exactly once, only for brand new accounts.
    await seedDemoWorkspace(tx, created);
    return created;
  });

  return user;
}

export async function registerAction(raw: unknown): Promise<ActionResult> {
  const ip = await clientIdentifier();
  const limit = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return { ok: false, error: `Too many sign-up attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.` };
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      fieldErrors: { email: ["An account with this email already exists. Try signing in instead."] },
    };
  }

  try {
    const user = await createAccount(parsed.data);
    await createSession(user.id);
  } catch (error) {
    console.error("[auth] register failed", error);
    return { ok: false, error: "We couldn't create your account. Please try again." };
  }

  redirect("/dashboard?welcome=1");
}

export async function loginAction(raw: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...flattenErrors(parsed.error) };

  const ip = await clientIdentifier();
  const key = `login:${ip}:${parsed.data.email}`;
  const limit = rateLimit(key, 8, 15 * 60 * 1000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many failed attempts. Try again in ${Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))} minutes.`,
    };
  }

  const user = await findUserByEmail(parsed.data.email);
  // Always run the hash comparison to keep timing consistent.
  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AA==");

  if (!user || !valid) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  try {
    resetRateLimit(key);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await createSession(user.id);
    void purgeExpiredSessions().catch(() => {});
  } catch (error) {
    console.error("[auth] login failed", error);
    return { ok: false, error: "Something went wrong while signing you in. Please try again." };
  }

  redirect("/dashboard");
}

export async function startGuestAction(): Promise<ActionResult> {
  const ip = await clientIdentifier();
  const limit = rateLimit(`guest:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return { ok: false, error: "Too many guest workspaces created from this network. Please sign up instead." };
  }

  try {
    const suffix = randomBytes(5).toString("hex");
    const user = await createAccount(
      {
        name: "Guest Explorer",
        email: `guest-${suffix}@guest.skillorbit.local`,
        password: randomBytes(24).toString("base64url"),
        profession: "Product Designer & Developer",
        baseCurrency: "USD",
      },
      { isGuest: true },
    );
    await createSession(user.id);
  } catch (error) {
    console.error("[auth] guest workspace failed", error);
    return { ok: false, error: "We couldn't start a guest workspace. Please try again." };
  }

  redirect("/dashboard?welcome=1");
}

export async function logoutAction() {
  await invalidateCurrentSession();
  redirect("/login");
}

export async function getSessionUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
