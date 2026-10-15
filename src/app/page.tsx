import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CheckSquare,
  FileText,
  FolderKanban,
  Globe2,
  Lock,
  Orbit,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestButton } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

const features = [
  { icon: Users, title: "Clients CRM", text: "Contacts, notes, tags, preferred currency and a full billing history per client." },
  { icon: FolderKanban, title: "Projects", text: "Fixed, hourly or retainer projects with budgets, deadlines and live progress." },
  { icon: CheckSquare, title: "Tasks", text: "A board and a list, due-date reminders, priorities and one-click completion." },
  { icon: FileText, title: "Invoices", text: "Line items, tax, discounts, partial payments, overdue tracking and printing." },
  { icon: Wallet, title: "Income in PKR & USD", text: "Record payments from Wise, Payoneer, JazzCash, bank transfer and more." },
  { icon: BarChart3, title: "Analytics", text: "Revenue trends, top clients, collection rate and days-to-pay at a glance." },
  { icon: Briefcase, title: "Portfolio", text: "A public, shareable page with your featured work and skills." },
  { icon: Bell, title: "Notifications", text: "Overdue invoices, payments and due tasks surface before they become problems." },
];

const professions = ["Developers", "Designers", "Video editors", "Copywriters", "Marketers", "Architects", "Consultants", "Photographers", "Tutors", "Accountants", "3D artists", "Virtual assistants"];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-glow" />
      <div className="absolute inset-0 -z-10 bg-grid opacity-60 [mask-image:radial-gradient(60%_40%_at_50%_0%,black,transparent)]" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-white shadow-md shadow-indigo-500/25">
            <Orbit className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">SkillOrbit</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="gradient">
            <Link href="/register">
              Get started <ArrowRight />
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-20 text-center sm:pt-20">
          <div className="animate-in fade-in slide-in-from-bottom-3 mx-auto inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur duration-500">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Built for 2,000+ skilled professions · PKR &amp; USD
          </div>
          <h1 className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight duration-700 sm:text-6xl sm:leading-[1.05]">
            Your entire freelance business, <span className="text-gradient">in one orbit</span>.
          </h1>
          <p className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-6 max-w-2xl text-base text-muted-foreground duration-700 sm:text-lg">
            Manage clients, projects, tasks, invoices, income, your portfolio and analytics from a single workspace designed for independent professionals.
          </p>
          <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 flex flex-col items-center justify-center gap-3 duration-1000 sm:flex-row">
            <Button asChild variant="gradient" size="lg">
              <Link href="/register">
                Create free workspace <ArrowRight />
              </Link>
            </Button>
            <GuestButton />
          </div>
          <div className="mt-14 overflow-hidden">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {professions.map((p) => (
                <span key={p} className="rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {p}
                </span>
              ))}
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">+ 1,988 more</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border bg-card p-2 shadow-float">
            <div className="rounded-2xl border bg-background p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Dashboard</p>
                  <p className="text-lg font-semibold">Good afternoon, Ayesha</p>
                </div>
                <span className="rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white">+ New invoice</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["Revenue this month", "$6,383", "+21%"],
                  ["Outstanding", "$6,200", "5 invoices"],
                  ["Active projects", "6", "2 due this week"],
                  ["Tasks due", "11", "2 overdue"],
                ].map(([label, value, meta]) => (
                  <div key={label} className="rounded-xl border bg-card p-4 text-left">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-xl font-semibold tabular">{value}</p>
                    <p className="mt-0.5 text-[11px] text-emerald-600">{meta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">Revenue · last 12 months</p>
                  <div className="mt-4 flex h-32 items-end gap-1.5">
                    {[12, 18, 10, 14, 22, 28, 35, 30, 48, 64, 58, 70].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500/80 to-fuchsia-400/80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-4 text-left">
                  <p className="text-sm font-semibold">Recent invoices</p>
                  <ul className="mt-3 space-y-2 text-xs">
                    {[
                      ["INV-0016", "Karachi Eats", "Rs 195,000", "Sent"],
                      ["INV-0015", "Northwind Fintech", "$1,200", "Sent"],
                      ["INV-0014", "Orbit Learning", "$1,500", "Overdue"],
                      ["INV-0012", "Lumen Health", "$4,250", "Paid"],
                    ].map(([num, client, amt, status]) => (
                      <li key={num} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-2">
                        <span>
                          <span className="font-semibold">{num}</span> <span className="text-muted-foreground">· {client}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="tabular font-medium">{amt}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${status === "Paid" ? "bg-emerald-100 text-emerald-700" : status === "Overdue" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}>{status}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Everything a solo business needs</h2>
            <p className="mt-3 text-muted-foreground">Replace the spreadsheet, the notes app and the invoice template with one tool that actually talks to itself.</p>
          </div>
          <div className="stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="card-hover rounded-2xl border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10 text-primary">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
            {[
              { icon: Lock, title: "Private by design", text: "Every record is scoped to your account. Sessions are httpOnly, passwords are hashed with scrypt." },
              { icon: Globe2, title: "Two currencies, one view", text: "Bill in PKR or USD per client and see unified analytics in your base currency with your own exchange rate." },
              { icon: Shield, title: "Production-ready", text: "PostgreSQL storage, validated forms, optimistic updates, and real workflows — not a mockup." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background text-primary">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="relative overflow-hidden rounded-3xl bg-[oklch(0.17_0.03_275)] px-6 py-16 text-white shadow-float">
            <div className="absolute -top-24 -left-20 size-80 rounded-full bg-indigo-500/30 blur-3xl" />
            <div className="absolute -right-20 -bottom-24 size-80 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">Start with a realistic demo workspace</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/70">Sign up and explore with real-looking clients, projects, invoices and analytics. Clear the demo data whenever you&apos;re ready.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
                <Link href="/register">
                  Create free account <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-2">
            <Orbit className="size-4 text-primary" /> SkillOrbit © {new Date().getFullYear()}
          </span>
          <span>Made for freelancers &amp; skilled professionals everywhere.</span>
        </div>
      </footer>
    </div>
  );
}
