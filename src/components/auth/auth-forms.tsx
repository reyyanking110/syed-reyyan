"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, NativeSelect } from "@/components/ui/primitives";
import { loginAction, registerAction, startGuestAction } from "@/lib/actions/auth";
import { PROFESSIONS } from "@/lib/constants";
import { loginSchema, registerSchema, type FieldErrors } from "@/lib/validations";

type LoginValues = z.input<typeof loginSchema>;
type RegisterValues = z.input<typeof registerSchema>;

function applyFieldErrors<T extends Record<string, unknown>>(fieldErrors: FieldErrors | undefined, setError: (name: keyof T & string, error: { message: string }) => void) {
  if (!fieldErrors) return;
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0] && key !== "_form") setError(key as keyof T & string, { message: messages[0] });
  }
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"} tabIndex={-1}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function GuestButton({ className }: { className?: string }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await startGuestAction();
          if (result && !result.ok) toast.error(result.error);
        })
      }
    >
      <Sparkles className="text-primary" /> Explore with a demo workspace
    </Button>
  );
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { register, handleSubmit, setError, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await loginAction(values);
    if (result && !result.ok) {
      setFormError(result.error);
      applyFieldErrors<LoginValues>(result.fieldErrors, setError);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="you@studio.com" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
        <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!formState.errors.password} {...register("password")} />
      </Field>
      <input type="hidden" name="next" value={next ?? ""} />
      <Button type="submit" variant="gradient" size="lg" className="w-full" loading={formState.isSubmitting}>
        Sign in <ArrowRight />
      </Button>
      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="relative z-10 bg-card px-2">or</span>
        <span className="absolute top-1/2 left-0 h-px w-full bg-border" />
      </div>
      <GuestButton className="w-full" />
      <p className="text-center text-sm text-muted-foreground">
        New to SkillOrbit?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", profession: "", baseCurrency: "USD" },
  });
  const { register, handleSubmit, setError, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await registerAction(values);
    if (result && !result.ok) {
      setFormError(result.error);
      applyFieldErrors<RegisterValues>(result.fieldErrors, setError);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <Field label="Full name" htmlFor="name" error={formState.errors.name?.message}>
        <Input id="name" autoComplete="name" placeholder="Ayesha Khan" aria-invalid={!!formState.errors.name} {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="you@studio.com" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={formState.errors.password?.message} hint="At least 8 characters.">
        <PasswordInput id="password" autoComplete="new-password" placeholder="Create a strong password" aria-invalid={!!formState.errors.password} {...register("password")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field label="What do you do?" htmlFor="profession" error={formState.errors.profession?.message} hint="Pick from 2,000+ professions or type your own.">
          <Input id="profession" list="profession-list" placeholder="e.g. UI/UX Designer" aria-invalid={!!formState.errors.profession} {...register("profession")} />
          <datalist id="profession-list">
            {PROFESSIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Base currency" htmlFor="baseCurrency">
          <NativeSelect id="baseCurrency" {...register("baseCurrency")}>
            <option value="USD">USD ($)</option>
            <option value="PKR">PKR (Rs)</option>
          </NativeSelect>
        </Field>
      </div>
      <Button type="submit" variant="gradient" size="lg" className="w-full" loading={formState.isSubmitting}>
        Create my workspace <ArrowRight />
      </Button>
      <p className="text-center text-xs text-muted-foreground">We&apos;ll add a realistic demo workspace you can clear anytime.</p>
      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="relative z-10 bg-card px-2">or</span>
        <span className="absolute top-1/2 left-0 h-px w-full bg-border" />
      </div>
      <GuestButton className="w-full" />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
