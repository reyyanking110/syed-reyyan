# SkillOrbit

**The all-in-one workspace for freelancers and skilled professionals** — developers, designers, writers, consultants and 2,000+ other professions. Manage clients, projects, tasks, invoices, payments, a public portfolio and business analytics in one place, with first-class support for **PKR** and **USD**.

Built with Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM and PostgreSQL.

---

## Features

| Area | What you get |
| --- | --- |
| **Authentication** | Email + password accounts (scrypt hashing), HTTP-only session cookies with sliding 30-day expiry, rate-limited login/registration, one-click **demo workspace** (guest account that can later be claimed). |
| **Dashboard** | Revenue KPIs with month-over-month change, outstanding/overdue balances, revenue vs. invoiced chart, upcoming tasks (one-click complete), recent invoices, active project progress and an activity timeline. |
| **Clients** | Full CRUD, status pipeline (lead → active → inactive), tags, preferred currency, search/filter/sort, per-client stats (billed, paid, outstanding, overdue) and tabs for projects, invoices, payments and notes. |
| **Projects** | Fixed / hourly / retainer billing, budgets, priorities, colour coding, tags, due-date tracking, progress from tasks, inline task management and budget-burn vs. invoiced. |
| **Tasks** | List and Kanban board views, quick-add, optimistic status changes, due-date buckets (overdue / today / this week), priority and project filters. |
| **Invoices** | Line-item editor with live totals, tax and discounts, automatic numbering (`INV-0001`), draft → sent → partially paid → paid / overdue lifecycle, duplicate, print-ready view (print to PDF), payment recording with method/reference. |
| **Income** | Payments in PKR or USD, automatic conversion to your base currency for reporting using a configurable rate. |
| **Portfolio** | Case-study cards with cover images or gradients, categories, tags, featured/private flags and a **public profile page** at `/p/<username>`. |
| **Analytics** | 3m / 6m / 12m / YTD ranges — revenue trends, invoice status mix, top clients and projects, payment methods, currency mix, task throughput and project pipeline. |
| **Settings** | Profile & skills, business details, invoice defaults, currency/conversion rate, email & password management, theme (light / dark / system), JSON export, demo-data removal and account deletion. |
| **Platform** | Global search (⌘K), notifications inbox, URL-driven filters, loading skeletons, empty states, error boundaries, optimistic updates, Zod validation shared by client and server, fully responsive premium UI. |

Every query and mutation is scoped to the signed-in user — data is private by construction.

---

## Quick start

### Prerequisites

- Node.js 20+ (tested with 22)
- A PostgreSQL database **or** nothing at all — the repo ships with an embedded PostgreSQL for local development.

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Start a database

Either point `DATABASE_URL` in `.env.local` at an existing PostgreSQL instance, or start the embedded one (data is stored in `.pgdata/`, which is git-ignored):

```bash
npm run db:local
```

### 3. Apply the schema

```bash
npm run db:migrate
```

### 4. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>, click **Try the demo** for an instantly populated workspace, or **Create account** for a fresh one. New accounts are seeded with realistic sample data (clearly flagged as demo and removable from *Settings → Data*) — existing records are never touched.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server (binds to `0.0.0.0:3000`). |
| `npm run build` / `npm start` | Production build and server. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint (Next.js + React Compiler rules). |
| `npm run db:local` | Start the embedded PostgreSQL (`postgresql://postgres:postgres@127.0.0.1:5432/app_db`). |
| `npm run db:generate` | Generate a new Drizzle migration from `src/db/schema.ts`. |
| `npm run db:migrate` | Apply pending migrations from `drizzle/`. |
| `npm run db:push` | Push the schema directly (prototyping only). |
| `npm run db:studio` | Open Drizzle Studio. |

---

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string. |
| `NEXT_PUBLIC_APP_URL` | recommended | Public origin (used for portfolio links and metadata), e.g. `https://app.example.com`. |
| `ALLOWED_ORIGINS` | optional | Comma-separated extra origins allowed to invoke Server Actions (useful behind proxies / preview hosts). |

---

## Architecture

```
src/
├─ app/                     # App Router
│  ├─ (auth)/               # /login, /register
│  ├─ (app)/                # Authenticated shell: dashboard, clients, projects, tasks,
│  │                        # invoices, analytics, portfolio, settings, notifications
│  ├─ p/[username]/         # Public portfolio page
│  └─ api/                  # /api/health, /api/export
├─ components/
│  ├─ ui/                   # Design-system primitives (buttons, cards, dialogs, tables…)
│  ├─ shared/               # Filters, confirm dialogs, skeletons, status badges
│  ├─ charts/               # Recharts wrappers
│  └─ <feature>/            # Feature views & forms (clients, projects, tasks, invoices…)
├─ db/                      # Drizzle schema, connection, demo seeder
├─ lib/
│  ├─ actions/              # Server Actions (all mutations) — return { ok, data | error, fieldErrors }
│  ├─ queries/              # Read models, always filtered by userId
│  ├─ auth/                 # Passwords (scrypt), sessions, DAL (`requireUser`), rate limiting
│  └─ validations/          # Zod schemas shared by react-hook-form and the server
└─ proxy.ts                 # Edge auth gate (redirects based on session cookie presence)
```

**Data flow.** Pages are React Server Components that call `requireUser()` and the query layer, then hand typed data to client views. Client views use `react-hook-form` + Zod for validation, call Server Actions for mutations, apply `useOptimistic` updates where latency matters, and rely on `revalidatePath` for consistency. Filters, search, tabs and ranges live in the URL so every view is linkable and refresh-safe.

**Security.** Passwords are hashed with `scrypt`; sessions are random 256-bit tokens stored hashed (SHA-256) and delivered as `HttpOnly; SameSite=Lax; Secure` cookies; the session is re-validated on every request; all data access is scoped by `userId`; auth endpoints are rate limited; Server Actions are protected by Next.js origin checks.

**Money.** Amounts are stored as `numeric(14,2)` in their original currency. Reports convert to the user's base currency using the `usdToPkrRate` configured in *Settings → Business*.

---

## Deployment

SkillOrbit runs anywhere Next.js runs (Vercel, Railway, Fly.io, Render, Docker…). Provision a PostgreSQL database, set `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`, run `npm run db:migrate` during release, then `npm run build && npm start`.

`GET /api/health` returns `{ ok: true }` once the database is reachable — wire it to your platform's health check.

---

## License

MIT
