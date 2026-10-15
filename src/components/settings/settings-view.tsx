"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Briefcase, Check, Database, Download, ExternalLink, KeyRound, Monitor, Moon, Palette, ShieldCheck, Sparkles, Sun, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog, TagsInput, useAction } from "@/components/shared/client-utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Switch } from "@/components/ui/overlays";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { changePasswordAction, claimGuestAccountAction, deleteAccountAction, removeDemoDataAction, updateBusinessAction, updateEmailAction, updateProfileAction } from "@/lib/actions/settings";
import { COUNTRIES, PROFESSIONS, SKILL_SUGGESTIONS } from "@/lib/constants";
import type { User } from "@/db/schema";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { z } from "zod";
import { accountEmailSchema, businessSchema, changePasswordSchema, claimGuestSchema, profileSchema, type BusinessInput, type ProfileInput } from "@/lib/validations";

type AccountInput = z.input<typeof accountEmailSchema>;
type PasswordChangeInput = z.input<typeof changePasswordSchema>;
type ClaimAccountInput = z.input<typeof claimGuestSchema>;

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "account", label: "Account", icon: KeyRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data", icon: Database },
  { id: "danger", label: "Danger zone", icon: AlertTriangle },
] as const;
type TabId = (typeof TABS)[number]["id"];

type SafeUser = Omit<User, "passwordHash">;

export function SettingsView({ user, demoCounts, appUrl }: { user: SafeUser; demoCounts: { clients: number; projects: number; invoices: number; tasks: number; total: number }; appUrl: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requested = searchParams.get("tab") as TabId | null;
  const tab: TabId = requested && TABS.some((t) => t.id === requested) ? requested : "profile";
  const setTab = (id: TabId) => router.replace(id === "profile" ? "/settings" : `/settings?tab=${id}`, { scroll: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, business defaults and account.</p>
      </div>
      {user.isGuest ? (
        <Card className="flex-col gap-3 border-primary/30 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-medium">You&apos;re exploring a demo workspace</p>
              <p className="text-sm text-muted-foreground">Claim this account with your email and a password to keep everything you create.</p>
            </div>
          </div>
          <Button onClick={() => setTab("account")}>Claim account</Button>
        </Card>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:px-0" aria-label="Settings sections">
          {TABS.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition", tab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground", item.id === "danger" && tab !== item.id && "hover:text-rose-600")} aria-current={tab === item.id ? "page" : undefined}>
              <item.icon className="size-4" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "profile" ? <ProfileTab user={user} appUrl={appUrl} /> : null}
          {tab === "business" ? <BusinessTab user={user} /> : null}
          {tab === "account" ? <AccountTab user={user} /> : null}
          {tab === "appearance" ? <AppearanceTab /> : null}
          {tab === "data" ? <DataTab user={user} demoCounts={demoCounts} /> : null}
          {tab === "danger" ? <DangerTab user={user} /> : null}
        </div>
      </div>
    </div>
  );
}

function applyErrors<T extends Record<string, unknown>>(fieldErrors: Partial<Record<string, string[]>> | undefined, setError: (name: keyof T & string, error: { message: string }) => void) {
  for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
    if (messages?.[0]) setError(key as keyof T & string, { message: messages[0] });
  }
}

function ProfileTab({ user, appUrl }: { user: SafeUser; appUrl: string }) {
  const router = useRouter();
  const { register, control, handleSubmit, setError, watch, formState } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema, undefined, { raw: true }),
    defaultValues: { name: user.name, username: user.username ?? "", profession: user.profession ?? "", headline: user.headline ?? "", bio: user.bio ?? "", skills: user.skills, location: user.location ?? "", website: user.website ?? "", avatarUrl: user.avatarUrl ?? "", portfolioPublic: user.portfolioPublic },
  });
  const username = watch("username");
  const onSubmit = handleSubmit(async (values) => {
    const result = await updateProfileAction(values);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
      applyErrors<ProfileInput>(result.fieldErrors, setError);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>This information appears on your public portfolio page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" required error={formState.errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Field label="Username" htmlFor="username" error={formState.errors.username?.message} hint={username ? `${appUrl.replace(/^https?:\/\//, "")}/p/${username}` : "Lowercase letters, numbers and dashes"}>
            <Input id="username" placeholder="your-handle" {...register("username")} />
          </Field>
          <Field label="Profession" htmlFor="profession" error={formState.errors.profession?.message}>
            <Input id="profession" list="professions" placeholder="Full-stack developer" {...register("profession")} />
            <datalist id="professions">
              {PROFESSIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Location" htmlFor="location" error={formState.errors.location?.message}>
            <Input id="location" list="countries" placeholder="Karachi, Pakistan" {...register("location")} />
            <datalist id="countries">
              {COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Headline" htmlFor="headline" className="sm:col-span-2" error={formState.errors.headline?.message}>
            <Input id="headline" placeholder="I build fast, accessible web apps for startups" {...register("headline")} />
          </Field>
          <Field label="Bio" htmlFor="bio" className="sm:col-span-2" error={formState.errors.bio?.message}>
            <Textarea id="bio" rows={4} placeholder="A few sentences about who you are and how you work." {...register("bio")} />
          </Field>
          <Field label="Skills" className="sm:col-span-2" hint="Press Enter or comma to add">
            <Controller control={control} name="skills" render={({ field }) => <TagsInput value={Array.isArray(field.value) ? field.value : []} onChange={field.onChange} placeholder="react, figma, seo…" suggestions={SKILL_SUGGESTIONS} />} />
          </Field>
          <Field label="Website" htmlFor="website" error={formState.errors.website?.message}>
            <Input id="website" type="url" placeholder="https://" {...register("website")} />
          </Field>
          <Field label="Avatar URL" htmlFor="avatarUrl" error={formState.errors.avatarUrl?.message}>
            <Input id="avatarUrl" type="url" placeholder="https://…/photo.jpg" {...register("avatarUrl")} />
          </Field>
          <Controller
            control={control}
            name="portfolioPublic"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm sm:col-span-2">
                <span>
                  <span className="font-medium">Public portfolio page</span>
                  <span className="block text-xs text-muted-foreground">Anyone with the link can view your public work.</span>
                </span>
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-2">
        {user.username ? (
          <Button type="button" variant="ghost" asChild>
            <Link href={`/p/${user.username}`} target="_blank">
              <ExternalLink /> View public page
            </Link>
          </Button>
        ) : null}
        <Button type="submit" loading={formState.isSubmitting}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function BusinessTab({ user }: { user: SafeUser }) {
  const router = useRouter();
  const { register, handleSubmit, setError, watch, formState } = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema, undefined, { raw: true }),
    defaultValues: { businessName: user.businessName ?? "", businessAddress: user.businessAddress ?? "", taxId: user.taxId ?? "", baseCurrency: user.baseCurrency, usdToPkrRate: user.usdToPkrRate, defaultTaxRate: user.defaultTaxRate, defaultPaymentTermsDays: user.defaultPaymentTermsDays, invoicePrefix: user.invoicePrefix, invoiceNotes: user.invoiceNotes ?? "", paymentInstructions: user.paymentInstructions ?? "" },
  });
  const prefix = watch("invoicePrefix");
  const onSubmit = handleSubmit(async (values) => {
    const result = await updateBusinessAction(values);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
      applyErrors<BusinessInput>(result.fieldErrors, setError);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>Shown on your invoices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="businessName" error={formState.errors.businessName?.message}>
            <Input id="businessName" placeholder={`${user.name} Studio`} {...register("businessName")} />
          </Field>
          <Field label="Tax / NTN ID" htmlFor="taxId" error={formState.errors.taxId?.message}>
            <Input id="taxId" placeholder="Optional" {...register("taxId")} />
          </Field>
          <Field label="Business address" htmlFor="businessAddress" className="sm:col-span-2" error={formState.errors.businessAddress?.message}>
            <Textarea id="businessAddress" rows={2} placeholder="Street, city, country" {...register("businessAddress")} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Currency & conversion</CardTitle>
          <CardDescription>Reports and dashboards are shown in your base currency.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Base currency" htmlFor="baseCurrency">
            <NativeSelect id="baseCurrency" {...register("baseCurrency")}>
              <option value="USD">USD — US Dollar</option>
              <option value="PKR">PKR — Pakistani Rupee</option>
            </NativeSelect>
          </Field>
          <Field label="USD → PKR rate" htmlFor="usdToPkrRate" error={formState.errors.usdToPkrRate?.message} hint="Used to convert between currencies in analytics">
            <Input id="usdToPkrRate" type="number" step="0.0001" min="1" {...register("usdToPkrRate")} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invoice defaults</CardTitle>
          <CardDescription>Pre-filled on every new invoice. You can always override per invoice.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Number prefix" htmlFor="invoicePrefix" error={formState.errors.invoicePrefix?.message} hint={`Next: ${(prefix || "INV").toUpperCase()}-${String(new Date().getFullYear())}-0001`}>
            <Input id="invoicePrefix" placeholder="INV" {...register("invoicePrefix")} />
          </Field>
          <Field label="Default tax %" htmlFor="defaultTaxRate" error={formState.errors.defaultTaxRate?.message}>
            <Input id="defaultTaxRate" type="number" step="0.01" min="0" max="100" {...register("defaultTaxRate")} />
          </Field>
          <Field label="Payment terms (days)" htmlFor="defaultPaymentTermsDays" error={formState.errors.defaultPaymentTermsDays?.message}>
            <Input id="defaultPaymentTermsDays" type="number" min="0" max="365" {...register("defaultPaymentTermsDays", { valueAsNumber: true })} />
          </Field>
          <Field label="Default notes" htmlFor="invoiceNotes" className="sm:col-span-3" error={formState.errors.invoiceNotes?.message}>
            <Textarea id="invoiceNotes" rows={2} placeholder="Thank you for your business!" {...register("invoiceNotes")} />
          </Field>
          <Field label="Payment instructions" htmlFor="paymentInstructions" className="sm:col-span-3" error={formState.errors.paymentInstructions?.message}>
            <Textarea id="paymentInstructions" rows={3} placeholder="Bank: … · IBAN: … · PayPal: …" {...register("paymentInstructions")} />
          </Field>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" loading={formState.isSubmitting}>
          Save business settings
        </Button>
      </div>
    </form>
  );
}

function AccountTab({ user }: { user: SafeUser }) {
  const router = useRouter();
  const account = useForm<AccountInput>({ resolver: zodResolver(accountEmailSchema, undefined, { raw: true }), defaultValues: { email: user.email, currentPassword: "" } });
  const password = useForm<PasswordChangeInput>({ resolver: zodResolver(changePasswordSchema, undefined, { raw: true }), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const claim = useForm<ClaimAccountInput>({ resolver: zodResolver(claimGuestSchema, undefined, { raw: true }), defaultValues: { email: "", password: "", confirmPassword: "" } });

  const saveAccount = account.handleSubmit(async (values) => {
    const result = await updateEmailAction(values);
    if (result.ok) {
      toast.success(result.message);
      account.reset({ email: values.email, currentPassword: "" });
      router.refresh();
    } else {
      toast.error(result.error);
      applyErrors<AccountInput>(result.fieldErrors, account.setError);
    }
  });
  const savePassword = password.handleSubmit(async (values) => {
    const result = await changePasswordAction(values);
    if (result.ok) {
      toast.success(result.message);
      password.reset();
    } else {
      toast.error(result.error);
      applyErrors<PasswordChangeInput>(result.fieldErrors, password.setError);
    }
  });
  const claimAccount = claim.handleSubmit(async (values) => {
    const result = await claimGuestAccountAction(values);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
      applyErrors<ClaimAccountInput>(result.fieldErrors, claim.setError);
    }
  });

  if (user.isGuest) {
    return (
      <form onSubmit={claimAccount} noValidate className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Claim your demo account</CardTitle>
            <CardDescription>Add an email and password to turn this demo workspace into a permanent account. Everything you&apos;ve created stays.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="claim-email" required error={claim.formState.errors.email?.message} className="sm:col-span-2">
              <Input id="claim-email" type="email" autoComplete="email" {...claim.register("email")} />
            </Field>
            <Field label="Password" htmlFor="claim-password" required error={claim.formState.errors.password?.message} hint="At least 8 characters">
              <Input id="claim-password" type="password" autoComplete="new-password" {...claim.register("password")} />
            </Field>
            <Field label="Confirm password" htmlFor="claim-confirm" required error={claim.formState.errors.confirmPassword?.message}>
              <Input id="claim-confirm" type="password" autoComplete="new-password" {...claim.register("confirmPassword")} />
            </Field>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" loading={claim.formState.isSubmitting}>
            <ShieldCheck /> Create my account
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveAccount} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Sign-in email</CardTitle>
            <CardDescription>Member since {formatDate(user.createdAt)}{user.lastLoginAt ? ` · last sign-in ${formatDate(user.lastLoginAt)}` : ""}.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Email address" htmlFor="email" required error={account.formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...account.register("email")} />
            </Field>
            <Field label="Current password" htmlFor="account-current-password" required error={account.formState.errors.currentPassword?.message}>
              <Input id="account-current-password" type="password" autoComplete="current-password" {...account.register("currentPassword")} />
            </Field>
            <Button type="submit" variant="outline" loading={account.formState.isSubmitting} className="mb-px">
              Update email
            </Button>
          </CardContent>
        </Card>
      </form>
      <form onSubmit={savePassword} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Changing your password signs out all other devices.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password" htmlFor="currentPassword" required error={password.formState.errors.currentPassword?.message}>
              <Input id="currentPassword" type="password" autoComplete="current-password" {...password.register("currentPassword")} />
            </Field>
            <Field label="New password" htmlFor="newPassword" required error={password.formState.errors.newPassword?.message}>
              <Input id="newPassword" type="password" autoComplete="new-password" {...password.register("newPassword")} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword" required error={password.formState.errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...password.register("confirmPassword")} />
            </Field>
          </CardContent>
          <div className="flex justify-end px-6 pb-6">
            <Button type="submit" loading={password.formState.isSubmitting}>
              Update password
            </Button>
          </div>
        </Card>
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>How SkillOrbit protects your account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            ["Passwords", "Hashed with scrypt and never stored in plain text."],
            ["Sessions", "HTTP-only, same-site cookies that expire after 30 days of inactivity."],
            ["Data isolation", "Every record is scoped to your account — no one else can read it."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border p-3">
              <p className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-emerald-600" /> {title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const options = [
    { value: "light", label: "Light", icon: Sun, description: "Bright and crisp" },
    { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
    { value: "system", label: "System", icon: Monitor, description: "Match your device" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>Choose how SkillOrbit looks on this device.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const active = mounted && (theme ?? "system") === option.value;
          return (
            <button key={option.value} type="button" onClick={() => setTheme(option.value)} className={cn("flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition hover:border-primary/50", active && "border-primary bg-primary/5 ring-2 ring-primary/20")} aria-pressed={active}>
              <span className={cn("flex size-9 items-center justify-center rounded-xl", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <option.icon className="size-4" />
              </span>
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DataTab({ user, demoCounts }: { user: SafeUser; demoCounts: { clients: number; projects: number; invoices: number; tasks: number; total: number } }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Download everything in your workspace as JSON. Your data is always yours.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/api/export" download>
              <Download /> Download export (.json)
            </a>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
          <CardDescription>
            {demoCounts.total > 0 ? `Your workspace contains ${demoCounts.clients} demo clients, ${demoCounts.projects} demo projects, ${demoCounts.tasks} demo tasks and ${demoCounts.invoices} demo invoices (${demoCounts.total} sample records in total).` : "No demo records in your workspace — everything here is yours."}
            {user.demoSeededAt ? ` Seeded ${formatDate(user.demoSeededAt)}.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {demoCounts.total > 0 ? (
            <Button variant="outline" onClick={() => setConfirmRemove(true)}>
              <Trash2 /> Remove demo data
            </Button>
          ) : null}
          <Badge tone="muted" className="self-center">Your own records are never touched</Badge>
        </CardContent>
      </Card>
      <ConfirmDialog open={confirmRemove} onOpenChange={setConfirmRemove} title="Remove all demo data?" description="Only records marked as demo will be deleted. Anything you created yourself stays." confirmLabel="Remove demo data" pending={pending} onConfirm={() => run(removeDemoDataAction(), { onSuccess: () => { setConfirmRemove(false); router.refresh(); } })} />
    </div>
  );
}

function DangerTab({ user }: { user: SafeUser }) {
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [passwordValue, setPasswordValue] = React.useState("");
  const { run, pending } = useAction();
  const phrase = "DELETE";
  return (
    <Card className="border-rose-500/30">
      <CardHeader>
        <CardTitle className="text-rose-600">Delete account</CardTitle>
        <CardDescription>Permanently removes your account and all clients, projects, tasks, invoices, payments and portfolio items. This cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 /> Delete my account
        </Button>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account permanently?</DialogTitle>
            <DialogDescription>Type <span className="font-mono font-semibold text-foreground">{phrase}</span> to confirm{user.isGuest ? "." : " and enter your password."}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Confirmation" htmlFor="delete-confirm">
              <Input id="delete-confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={phrase} autoComplete="off" />
            </Field>
            {!user.isGuest ? (
              <Field label="Password" htmlFor="delete-password">
                <Input id="delete-password" type="password" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} autoComplete="current-password" />
              </Field>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={confirmation !== phrase || (!user.isGuest && !passwordValue)} loading={pending} onClick={() => run(deleteAccountAction({ confirmation, password: user.isGuest ? "guest" : passwordValue }), { onSuccess: () => { window.location.href = "/login?deleted=1"; } })}>
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
