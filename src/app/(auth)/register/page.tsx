import type { Metadata } from "next";
import Link from "next/link";
import { Orbit } from "lucide-react";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-white">
          <Orbit className="size-4" />
        </span>
        <span className="font-semibold">SkillOrbit</span>
      </Link>
      <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Free to start. No credit card required.</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
