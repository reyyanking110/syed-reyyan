import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, FileText, FolderKanban, Orbit, Users } from "lucide-react";

const highlights = [
  { icon: Users, title: "Clients & projects", text: "Every client, project and task in one calm place." },
  { icon: FileText, title: "Invoices in PKR & USD", text: "Send polished invoices and track every payment." },
  { icon: BarChart3, title: "Business analytics", text: "Know your best clients, months and payment habits." },
  { icon: FolderKanban, title: "Portfolio that sells", text: "A public page that shows off your best work." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.17_0.03_275)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
        <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-32 size-[26rem] rounded-full bg-fuchsia-500/25 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
            <Orbit className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">SkillOrbit</span>
        </Link>
        <div className="relative max-w-md space-y-8">
          <div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Run your freelance business like a <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">studio</span>.
            </h2>
            <p className="mt-4 text-base text-white/70">Built for developers, designers, writers, consultants and 2,000+ skilled professions — from Karachi to the world.</p>
          </div>
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-white/60">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} SkillOrbit. Your data stays private and encrypted in transit.</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
