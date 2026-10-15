import { addDays, format, subDays } from "date-fns";
import { eq } from "drizzle-orm";
import type { Transaction } from "@/db";
import {
  activities,
  clients,
  invoiceItems,
  invoices,
  notifications,
  payments,
  portfolioItems,
  projects,
  tasks,
  users,
  type Currency,
  type InvoiceStatus,
  type PaymentMethod,
  type Priority,
  type ProjectStatus,
  type TaskStatus,
  type User,
} from "@/db/schema";
import { roundMoney } from "@/lib/utils";

const d = (date: Date) => format(date, "yyyy-MM-dd");
const money = (value: number) => roundMoney(value).toFixed(2);

type SeedClient = {
  key: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string | null;
  country: string;
  city: string;
  status: "lead" | "active" | "inactive";
  currency: Currency;
  tags: string[];
  color: string;
  notes: string | null;
  createdDaysAgo: number;
};

const SEED_CLIENTS: SeedClient[] = [
  {
    key: "lumen",
    name: "Sarah Mitchell",
    company: "Lumen Health",
    email: "sarah@lumenhealth.io",
    phone: "+1 415 555 0132",
    website: "https://lumenhealth.io",
    country: "United States",
    city: "San Francisco",
    status: "active",
    currency: "USD",
    tags: ["healthcare", "saas", "long-term"],
    color: "#0ea5e9",
    notes: "Prefers async updates on Slack. Invoices approved by finance every Friday.",
    createdDaysAgo: 210,
  },
  {
    key: "karachi-eats",
    name: "Bilal Ahmed",
    company: "Karachi Eats",
    email: "bilal@karachieats.pk",
    phone: "+92 300 2345678",
    website: "https://karachieats.pk",
    country: "Pakistan",
    city: "Karachi",
    status: "active",
    currency: "PKR",
    tags: ["food-tech", "mobile"],
    color: "#f97316",
    notes: "Pays via bank transfer (Meezan). Likes weekly demo calls on Thursdays.",
    createdDaysAgo: 95,
  },
  {
    key: "northwind",
    name: "James Okafor",
    company: "Northwind Fintech",
    email: "james@northwind.finance",
    phone: "+44 20 7946 0958",
    website: "https://northwind.finance",
    country: "United Kingdom",
    city: "London",
    status: "active",
    currency: "USD",
    tags: ["fintech", "retainer", "seo"],
    color: "#6366f1",
    notes: "Monthly SEO & content retainer, billed on the 1st.",
    createdDaysAgo: 160,
  },
  {
    key: "atlas",
    name: "Layla Haddad",
    company: "Atlas Architects",
    email: "layla@atlas-arch.ae",
    phone: "+971 4 555 0197",
    website: "https://atlas-arch.ae",
    country: "United Arab Emirates",
    city: "Dubai",
    status: "active",
    currency: "USD",
    tags: ["architecture", "3d"],
    color: "#14b8a6",
    notes: "Hourly engagement for 3D visualisation. Follow up on overdue invoice.",
    createdDaysAgo: 70,
  },
  {
    key: "bloom",
    name: "Hira Siddiqui",
    company: "Bloom Skincare",
    email: "hira@bloomskin.pk",
    phone: "+92 321 8765432",
    website: null,
    country: "Pakistan",
    city: "Lahore",
    status: "lead",
    currency: "PKR",
    tags: ["beauty", "packaging", "launch"],
    color: "#ec4899",
    notes: "Referred by Bilal. Proposal sent for packaging & launch campaign.",
    createdDaysAgo: 12,
  },
  {
    key: "orbit",
    name: "Priya Nair",
    company: "Orbit Learning",
    email: "priya@orbitlearning.ca",
    phone: "+1 647 555 0184",
    website: "https://orbitlearning.ca",
    country: "Canada",
    city: "Toronto",
    status: "active",
    currency: "USD",
    tags: ["edtech", "nextjs", "hourly"],
    color: "#8b5cf6",
    notes: "Two-week sprints, invoice at the end of each sprint.",
    createdDaysAgo: 120,
  },
  {
    key: "peak",
    name: "Usman Tariq",
    company: "Peak Performance Gym",
    email: "usman@peakgym.pk",
    phone: "+92 333 1122334",
    website: null,
    country: "Pakistan",
    city: "Karachi",
    status: "inactive",
    currency: "PKR",
    tags: ["fitness", "social-media"],
    color: "#10b981",
    notes: "One-off social media template project. Open to future work.",
    createdDaysAgo: 240,
  },
  {
    key: "sunrise",
    name: "Faisal Khan",
    company: "Sunrise Textiles",
    email: "faisal@sunrisetextiles.pk",
    phone: "+92 345 5566778",
    website: "https://sunrisetextiles.pk",
    country: "Pakistan",
    city: "Faisalabad",
    status: "lead",
    currency: "PKR",
    tags: ["textile", "catalogue"],
    color: "#f59e0b",
    notes: "Needs a B2B product catalogue website before the January expo.",
    createdDaysAgo: 6,
  },
  {
    key: "amna",
    name: "Dr. Amna Raza",
    company: "Amna Dental Clinic",
    email: "amna@amnadental.pk",
    phone: "+92 302 9988776",
    website: null,
    country: "Pakistan",
    city: "Karachi",
    status: "inactive",
    currency: "PKR",
    tags: ["clinic", "website"],
    color: "#3b82f6",
    notes: null,
    createdDaysAgo: 330,
  },
];

type SeedProject = {
  key: string;
  client: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  billingType: "fixed" | "hourly" | "retainer";
  budget: number | null;
  hourlyRate: number | null;
  currency: Currency;
  startDaysAgo: number;
  dueInDays: number | null;
  completedDaysAgo?: number;
  color: string;
  tags: string[];
};

const SEED_PROJECTS: SeedProject[] = [
  {
    key: "lumen-portal",
    client: "lumen",
    name: "Patient Portal Redesign",
    description:
      "End-to-end redesign of the Lumen patient portal: appointment booking, lab results and messaging. Deliverables include a Figma design system and production-ready React components.",
    status: "in_progress",
    priority: "high",
    billingType: "fixed",
    budget: 8500,
    hourlyRate: null,
    currency: "USD",
    startDaysAgo: 42,
    dueInDays: 21,
    color: "#0ea5e9",
    tags: ["ui/ux", "react", "healthcare"],
  },
  {
    key: "lumen-brand",
    client: "lumen",
    name: "Brand Guidelines v2",
    description: "Refresh of the Lumen Health brand book with new typography, colour system and iconography.",
    status: "completed",
    priority: "medium",
    billingType: "fixed",
    budget: 2200,
    hourlyRate: null,
    currency: "USD",
    startDaysAgo: 150,
    dueInDays: -118,
    completedDaysAgo: 120,
    color: "#38bdf8",
    tags: ["branding"],
  },
  {
    key: "ke-rider",
    client: "karachi-eats",
    name: "Rider App UI/UX",
    description:
      "Mobile UX for the Karachi Eats rider app — onboarding, order flow, navigation hand-off and earnings dashboard. Designed for low-end Android devices and Urdu/English localisation.",
    status: "in_progress",
    priority: "high",
    billingType: "fixed",
    budget: 650000,
    hourlyRate: null,
    currency: "PKR",
    startDaysAgo: 30,
    dueInDays: 35,
    color: "#f97316",
    tags: ["mobile", "figma", "urdu"],
  },
  {
    key: "nw-website",
    client: "northwind",
    name: "Marketing Website Rebuild",
    description: "Next.js marketing site with CMS, pricing calculator and a 95+ Lighthouse score.",
    status: "completed",
    priority: "high",
    billingType: "fixed",
    budget: 6000,
    hourlyRate: null,
    currency: "USD",
    startDaysAgo: 130,
    dueInDays: -80,
    completedDaysAgo: 78,
    color: "#6366f1",
    tags: ["nextjs", "cms", "seo"],
  },
  {
    key: "nw-retainer",
    client: "northwind",
    name: "SEO & Content Retainer",
    description: "Monthly retainer: 4 long-form articles, technical SEO audits and quarterly keyword strategy.",
    status: "in_progress",
    priority: "medium",
    billingType: "retainer",
    budget: 1200,
    hourlyRate: null,
    currency: "USD",
    startDaysAgo: 75,
    dueInDays: 290,
    color: "#818cf8",
    tags: ["seo", "content", "retainer"],
  },
  {
    key: "atlas-3d",
    client: "atlas",
    name: "3D Visualisation Set",
    description: "Photoreal exterior and interior renders for the Marina Towers proposal. Billed hourly.",
    status: "on_hold",
    priority: "medium",
    billingType: "hourly",
    budget: 3600,
    hourlyRate: 45,
    currency: "USD",
    startDaysAgo: 60,
    dueInDays: 14,
    color: "#14b8a6",
    tags: ["3d", "blender", "archviz"],
  },
  {
    key: "bloom-launch",
    client: "bloom",
    name: "Packaging & Launch Campaign",
    description: "Packaging design for 4 SKUs plus launch creatives for Instagram and TikTok.",
    status: "planning",
    priority: "medium",
    billingType: "fixed",
    budget: 480000,
    hourlyRate: null,
    currency: "PKR",
    startDaysAgo: -7,
    dueInDays: 60,
    color: "#ec4899",
    tags: ["packaging", "social"],
  },
  {
    key: "orbit-lms",
    client: "orbit",
    name: "LMS Dashboard (Next.js)",
    description:
      "Instructor and student dashboards for the Orbit Learning platform — course analytics, grading and live sessions. Two-week sprints billed hourly.",
    status: "in_progress",
    priority: "urgent",
    billingType: "hourly",
    budget: 12000,
    hourlyRate: 50,
    currency: "USD",
    startDaysAgo: 100,
    dueInDays: 45,
    color: "#8b5cf6",
    tags: ["nextjs", "dashboard", "edtech"],
  },
  {
    key: "peak-social",
    client: "peak",
    name: "Social Media Templates",
    description: "30 editable Instagram and Facebook templates with brand colours and Urdu typography.",
    status: "completed",
    priority: "low",
    billingType: "fixed",
    budget: 95000,
    hourlyRate: null,
    currency: "PKR",
    startDaysAgo: 230,
    dueInDays: -205,
    completedDaysAgo: 208,
    color: "#10b981",
    tags: ["social", "templates"],
  },
  {
    key: "sunrise-catalogue",
    client: "sunrise",
    name: "Product Catalogue Website",
    description: "B2B catalogue with 200+ fabrics, enquiry forms and WhatsApp ordering. Target launch before the January expo.",
    status: "planning",
    priority: "medium",
    billingType: "fixed",
    budget: 350000,
    hourlyRate: null,
    currency: "PKR",
    startDaysAgo: -14,
    dueInDays: 75,
    color: "#f59e0b",
    tags: ["website", "catalogue"],
  },
  {
    key: "amna-site",
    client: "amna",
    name: "Clinic Website & Booking",
    description: "Five-page clinic website with online appointment booking and Google Maps integration.",
    status: "completed",
    priority: "low",
    billingType: "fixed",
    budget: 120000,
    hourlyRate: null,
    currency: "PKR",
    startDaysAgo: 320,
    dueInDays: -290,
    completedDaysAgo: 292,
    color: "#3b82f6",
    tags: ["website", "booking"],
  },
];

type SeedTask = {
  project: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueInDays: number | null;
  estimatedHours?: number;
};

const SEED_TASKS: SeedTask[] = [
  // Lumen portal
  { project: "lumen-portal", title: "Audit current portal & document pain points", status: "done", priority: "high", dueInDays: -35, estimatedHours: 6 },
  { project: "lumen-portal", title: "Design appointment booking flow", status: "done", priority: "high", dueInDays: -20, estimatedHours: 14 },
  { project: "lumen-portal", title: "Lab results screens (desktop + mobile)", status: "review", priority: "high", dueInDays: 1, estimatedHours: 12, description: "Awaiting feedback from Sarah and the clinical team." },
  { project: "lumen-portal", title: "Secure messaging UI", status: "in_progress", priority: "high", dueInDays: 5, estimatedHours: 10 },
  { project: "lumen-portal", title: "Build React component library", status: "in_progress", priority: "medium", dueInDays: 12, estimatedHours: 24 },
  { project: "lumen-portal", title: "Accessibility pass (WCAG 2.2 AA)", status: "todo", priority: "medium", dueInDays: 16, estimatedHours: 8 },
  { project: "lumen-portal", title: "Handoff & developer documentation", status: "todo", priority: "medium", dueInDays: 20, estimatedHours: 6 },
  // Karachi Eats
  { project: "ke-rider", title: "Rider onboarding & KYC screens", status: "done", priority: "high", dueInDays: -12, estimatedHours: 10 },
  { project: "ke-rider", title: "Order acceptance & navigation hand-off", status: "in_progress", priority: "urgent", dueInDays: 0, estimatedHours: 12, description: "Demo with Bilal on Thursday." },
  { project: "ke-rider", title: "Earnings dashboard with weekly payouts", status: "todo", priority: "high", dueInDays: 9, estimatedHours: 10 },
  { project: "ke-rider", title: "Urdu localisation review", status: "todo", priority: "medium", dueInDays: 18, estimatedHours: 4 },
  { project: "ke-rider", title: "Usability test with 5 riders", status: "todo", priority: "medium", dueInDays: 24, estimatedHours: 6 },
  // Northwind retainer
  { project: "nw-retainer", title: "Publish article: 'Open banking in 2026'", status: "done", priority: "medium", dueInDays: -6, estimatedHours: 5 },
  { project: "nw-retainer", title: "Technical SEO audit — October", status: "in_progress", priority: "medium", dueInDays: 3, estimatedHours: 4 },
  { project: "nw-retainer", title: "Draft article: 'Embedded finance for SMEs'", status: "todo", priority: "medium", dueInDays: 7, estimatedHours: 5 },
  { project: "nw-retainer", title: "Quarterly keyword strategy deck", status: "todo", priority: "low", dueInDays: 28, estimatedHours: 6 },
  // Atlas
  { project: "atlas-3d", title: "Exterior render — dusk lighting", status: "done", priority: "medium", dueInDays: -30, estimatedHours: 12 },
  { project: "atlas-3d", title: "Lobby interior render", status: "in_progress", priority: "medium", dueInDays: -2, estimatedHours: 10, description: "Paused until the overdue invoice is cleared." },
  { project: "atlas-3d", title: "Follow up on overdue invoice", status: "todo", priority: "urgent", dueInDays: 0, estimatedHours: 0.5 },
  // Bloom
  { project: "bloom-launch", title: "Moodboard & packaging direction", status: "todo", priority: "medium", dueInDays: 4, estimatedHours: 6 },
  { project: "bloom-launch", title: "Kick-off call with Hira", status: "todo", priority: "high", dueInDays: 2, estimatedHours: 1 },
  // Orbit
  { project: "orbit-lms", title: "Sprint 3: Grading workflow", status: "done", priority: "high", dueInDays: -8, estimatedHours: 20 },
  { project: "orbit-lms", title: "Sprint 4: Live sessions (WebRTC) UI", status: "in_progress", priority: "urgent", dueInDays: 6, estimatedHours: 24 },
  { project: "orbit-lms", title: "Course analytics charts", status: "review", priority: "high", dueInDays: 2, estimatedHours: 14 },
  { project: "orbit-lms", title: "Fix flaky e2e tests on CI", status: "todo", priority: "medium", dueInDays: -1, estimatedHours: 3 },
  { project: "orbit-lms", title: "Sprint 5 planning with Priya", status: "todo", priority: "medium", dueInDays: 8, estimatedHours: 2 },
  // Sunrise
  { project: "sunrise-catalogue", title: "Send proposal & timeline", status: "in_progress", priority: "high", dueInDays: 1, estimatedHours: 2 },
  // Personal / business admin
  { project: null, title: "File quarterly tax return (FBR)", status: "todo", priority: "high", dueInDays: 11, estimatedHours: 3 },
  { project: null, title: "Update portfolio with Northwind case study", status: "todo", priority: "low", dueInDays: 14, estimatedHours: 3 },
  { project: null, title: "Renew Figma & Adobe subscriptions", status: "done", priority: "low", dueInDays: -3, estimatedHours: 0.5 },
];

type SeedInvoice = {
  client: string;
  project: string | null;
  status: InvoiceStatus;
  currency: Currency;
  issueDaysAgo: number;
  termsDays: number;
  taxRate?: number;
  discount?: number;
  items: { description: string; quantity: number; unitPrice: number }[];
  payments?: { amount: number; daysAfterIssue: number; method: PaymentMethod; reference?: string }[];
  notes?: string;
};

const SEED_INVOICES: SeedInvoice[] = [
  {
    client: "amna",
    project: "amna-site",
    status: "paid",
    currency: "PKR",
    issueDaysAgo: 300,
    termsDays: 14,
    items: [
      { description: "Clinic website design & development (5 pages)", quantity: 1, unitPrice: 95000 },
      { description: "Online booking integration", quantity: 1, unitPrice: 25000 },
    ],
    payments: [{ amount: 120000, daysAfterIssue: 9, method: "bank_transfer", reference: "HBL-7781" }],
  },
  {
    client: "lumen",
    project: null,
    status: "paid",
    currency: "USD",
    issueDaysAgo: 268,
    termsDays: 14,
    items: [{ description: "Landing page design (desktop + mobile)", quantity: 1, unitPrice: 1500 }],
    payments: [{ amount: 1500, daysAfterIssue: 10, method: "payoneer", reference: "PY-71204" }],
  },
  {
    client: "amna",
    project: "amna-site",
    status: "paid",
    currency: "PKR",
    issueDaysAgo: 242,
    termsDays: 7,
    items: [
      { description: "Website maintenance (3 months)", quantity: 3, unitPrice: 8000 },
      { description: "Local SEO setup (Google Business Profile)", quantity: 1, unitPrice: 16000 },
    ],
    payments: [{ amount: 40000, daysAfterIssue: 3, method: "easypaisa", reference: "EP-33817" }],
  },
  {
    client: "peak",
    project: "peak-social",
    status: "paid",
    currency: "PKR",
    issueDaysAgo: 212,
    termsDays: 7,
    items: [{ description: "Social media template pack (30 templates)", quantity: 1, unitPrice: 95000 }],
    payments: [{ amount: 95000, daysAfterIssue: 4, method: "jazzcash", reference: "JC-20419" }],
  },
  {
    client: "peak",
    project: null,
    status: "paid",
    currency: "PKR",
    issueDaysAgo: 182,
    termsDays: 7,
    items: [{ description: "Logo refresh & brand colour update", quantity: 1, unitPrice: 65000 }],
    payments: [{ amount: 65000, daysAfterIssue: 6, method: "jazzcash", reference: "JC-24180" }],
  },
  {
    client: "lumen",
    project: null,
    status: "paid",
    currency: "USD",
    issueDaysAgo: 158,
    termsDays: 14,
    items: [{ description: "UX audit & recommendations report", quantity: 1, unitPrice: 900 }],
    payments: [{ amount: 900, daysAfterIssue: 12, method: "payoneer" }],
  },
  {
    client: "lumen",
    project: "lumen-brand",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 125,
    termsDays: 14,
    items: [
      { description: "Brand guidelines v2 — typography & colour system", quantity: 1, unitPrice: 1400 },
      { description: "Custom icon set (48 icons)", quantity: 1, unitPrice: 800 },
    ],
    payments: [{ amount: 2200, daysAfterIssue: 11, method: "payoneer", reference: "PY-88213" }],
  },
  {
    client: "northwind",
    project: "nw-website",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 118,
    termsDays: 14,
    items: [{ description: "Marketing website rebuild — 50% deposit", quantity: 1, unitPrice: 3000 }],
    payments: [{ amount: 3000, daysAfterIssue: 6, method: "wise", reference: "WISE-3391" }],
  },
  {
    client: "orbit",
    project: "orbit-lms",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 92,
    termsDays: 14,
    items: [{ description: "Sprint 1 — Instructor dashboard (development hours)", quantity: 40, unitPrice: 50 }],
    payments: [{ amount: 2000, daysAfterIssue: 8, method: "wise" }],
  },
  {
    client: "northwind",
    project: "nw-website",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 80,
    termsDays: 14,
    items: [{ description: "Marketing website rebuild — final 50%", quantity: 1, unitPrice: 3000 }],
    payments: [{ amount: 3000, daysAfterIssue: 12, method: "wise", reference: "WISE-3517" }],
  },
  {
    client: "northwind",
    project: "nw-retainer",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 74,
    termsDays: 7,
    items: [{ description: "SEO & content retainer — month 1", quantity: 1, unitPrice: 1200 }],
    payments: [{ amount: 1200, daysAfterIssue: 3, method: "wise" }],
  },
  {
    client: "orbit",
    project: "orbit-lms",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 62,
    termsDays: 14,
    items: [{ description: "Sprint 2 — Student dashboard (development hours)", quantity: 44, unitPrice: 50 }],
    payments: [{ amount: 2200, daysAfterIssue: 10, method: "wise" }],
  },
  {
    client: "northwind",
    project: "nw-retainer",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 44,
    termsDays: 7,
    items: [{ description: "SEO & content retainer — month 2", quantity: 1, unitPrice: 1200 }],
    payments: [{ amount: 1200, daysAfterIssue: 2, method: "wise" }],
  },
  {
    client: "lumen",
    project: "lumen-portal",
    status: "paid",
    currency: "USD",
    issueDaysAgo: 38,
    termsDays: 14,
    items: [{ description: "Patient portal redesign — 50% milestone", quantity: 1, unitPrice: 4250 }],
    payments: [{ amount: 4250, daysAfterIssue: 9, method: "payoneer", reference: "PY-91022" }],
  },
  {
    client: "karachi-eats",
    project: "ke-rider",
    status: "paid",
    currency: "PKR",
    issueDaysAgo: 26,
    termsDays: 7,
    items: [{ description: "Rider app UI/UX — 40% kickoff payment", quantity: 1, unitPrice: 260000 }],
    payments: [{ amount: 260000, daysAfterIssue: 5, method: "bank_transfer", reference: "MZN-55120" }],
  },
  {
    client: "orbit",
    project: "orbit-lms",
    status: "partially_paid",
    currency: "USD",
    issueDaysAgo: 21,
    termsDays: 28,
    items: [
      { description: "Sprint 3 — Grading workflow (development hours)", quantity: 42, unitPrice: 50 },
      { description: "Design QA & bug bash", quantity: 8, unitPrice: 50 },
    ],
    payments: [{ amount: 1500, daysAfterIssue: 7, method: "wise", reference: "Partial — remainder next cycle" }],
    notes: "Remaining balance due at the end of the billing cycle.",
  },
  {
    client: "atlas",
    project: "atlas-3d",
    status: "overdue",
    currency: "USD",
    issueDaysAgo: 40,
    termsDays: 28,
    items: [
      { description: "Exterior render — dusk lighting (hours)", quantity: 24, unitPrice: 45 },
      { description: "Revisions round 1 (hours)", quantity: 16, unitPrice: 45 },
    ],
    notes: "Second reminder sent. Work paused until cleared.",
  },
  {
    client: "northwind",
    project: "nw-retainer",
    status: "sent",
    currency: "USD",
    issueDaysAgo: 4,
    termsDays: 14,
    items: [{ description: "SEO & content retainer — month 3", quantity: 1, unitPrice: 1200 }],
  },
  {
    client: "karachi-eats",
    project: "ke-rider",
    status: "sent",
    currency: "PKR",
    issueDaysAgo: 2,
    termsDays: 7,
    items: [{ description: "Rider app UI/UX — 30% design milestone", quantity: 1, unitPrice: 195000 }],
  },
  {
    client: "orbit",
    project: "orbit-lms",
    status: "overdue",
    currency: "USD",
    issueDaysAgo: 18,
    termsDays: 14,
    items: [{ description: "Sprint 3.5 — Analytics charts (development hours)", quantity: 30, unitPrice: 50 }],
  },
  {
    client: "lumen",
    project: "lumen-portal",
    status: "draft",
    currency: "USD",
    issueDaysAgo: 0,
    termsDays: 14,
    items: [{ description: "Patient portal redesign — 25% milestone (lab results)", quantity: 1, unitPrice: 2125 }],
  },
];

const SEED_PORTFOLIO = [
  {
    title: "Lumen Health — Patient Portal",
    category: "UI/UX Design",
    description:
      "A calmer, faster patient portal for a US telehealth startup. Appointment booking time dropped from 4 minutes to 70 seconds in usability testing.",
    tags: ["Figma", "React", "Design system"],
    gradient: "from-sky-500 via-cyan-400 to-emerald-400",
    featured: true,
    client: "lumen",
    project: "lumen-portal",
    liveUrl: "https://lumenhealth.io",
    completedDaysAgo: 10,
  },
  {
    title: "Northwind Fintech — Marketing Website",
    category: "Web Development",
    description:
      "Next.js marketing site with a headless CMS, interactive pricing calculator and a 98 Lighthouse performance score. Organic traffic up 61% in 90 days.",
    tags: ["Next.js", "Sanity", "SEO"],
    gradient: "from-violet-600 via-indigo-500 to-sky-400",
    featured: true,
    client: "northwind",
    project: "nw-website",
    liveUrl: "https://northwind.finance",
    completedDaysAgo: 78,
  },
  {
    title: "Karachi Eats — Rider App",
    category: "Mobile App",
    description:
      "Bilingual (Urdu/English) rider experience designed for low-end Android devices and bright outdoor conditions.",
    tags: ["Mobile", "Figma", "Localisation"],
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    featured: true,
    client: "karachi-eats",
    project: "ke-rider",
    liveUrl: null,
    completedDaysAgo: null,
  },
  {
    title: "Bloom Skincare — Brand Identity",
    category: "Brand Identity",
    description: "Logo, packaging system and launch creatives for a Lahore-based clean beauty brand.",
    tags: ["Branding", "Packaging", "Illustrator"],
    gradient: "from-fuchsia-500 via-pink-500 to-rose-400",
    featured: false,
    client: "bloom",
    project: "bloom-launch",
    liveUrl: null,
    completedDaysAgo: null,
  },
  {
    title: "Atlas Architects — Marina Towers Renders",
    category: "3D & Architecture",
    description: "Photoreal exterior and lobby renders produced in Blender for a Dubai waterfront proposal.",
    tags: ["Blender", "Archviz"],
    gradient: "from-emerald-500 via-teal-500 to-sky-500",
    featured: false,
    client: "atlas",
    project: "atlas-3d",
    liveUrl: null,
    completedDaysAgo: 28,
  },
  {
    title: "Orbit Learning — LMS Dashboards",
    category: "Web Development",
    description: "Instructor and student dashboards with course analytics, grading workflows and live sessions.",
    tags: ["Next.js", "TypeScript", "Charts"],
    gradient: "from-blue-600 via-indigo-600 to-purple-700",
    featured: true,
    client: "orbit",
    project: "orbit-lms",
    liveUrl: "https://orbitlearning.ca",
    completedDaysAgo: null,
  },
  {
    title: "Peak Performance — Social Templates",
    category: "Graphic Design",
    description: "30 editable Instagram and Facebook templates with Urdu typography for a Karachi gym.",
    tags: ["Social media", "Canva", "Urdu"],
    gradient: "from-lime-400 via-emerald-500 to-teal-600",
    featured: false,
    client: "peak",
    project: "peak-social",
    liveUrl: null,
    completedDaysAgo: 208,
  },
  {
    title: "Open-source UI Kit",
    category: "Web Development",
    description: "A personal project: 40+ accessible React components with Tailwind CSS, used by 1.2k developers.",
    tags: ["React", "Tailwind", "Open source"],
    gradient: "from-slate-700 via-slate-900 to-black",
    featured: false,
    client: null,
    project: null,
    liveUrl: "https://github.com",
    completedDaysAgo: 160,
  },
];

export async function seedDemoWorkspace(tx: Transaction, user: User) {
  const now = new Date();

  /* ------------------------------- Clients ------------------------------- */
  const clientRows = await tx
    .insert(clients)
    .values(
      SEED_CLIENTS.map((client) => ({
        userId: user.id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        website: client.website,
        country: client.country,
        city: client.city,
        notes: client.notes,
        status: client.status,
        currency: client.currency,
        tags: client.tags,
        color: client.color,
        isDemo: true,
        createdAt: subDays(now, client.createdDaysAgo),
        updatedAt: subDays(now, Math.max(0, client.createdDaysAgo - 5)),
      })),
    )
    .returning({ id: clients.id });
  const clientId = new Map(SEED_CLIENTS.map((client, index) => [client.key, clientRows[index].id]));

  /* ------------------------------- Projects ------------------------------ */
  const projectRows = await tx
    .insert(projects)
    .values(
      SEED_PROJECTS.map((project) => ({
        userId: user.id,
        clientId: clientId.get(project.client) ?? null,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        billingType: project.billingType,
        budget: project.budget === null ? null : money(project.budget),
        hourlyRate: project.hourlyRate === null ? null : money(project.hourlyRate),
        currency: project.currency,
        startDate: d(subDays(now, project.startDaysAgo)),
        dueDate: project.dueInDays === null ? null : d(addDays(now, project.dueInDays)),
        completedAt: project.completedDaysAgo ? subDays(now, project.completedDaysAgo) : null,
        color: project.color,
        tags: project.tags,
        isDemo: true,
        createdAt: subDays(now, Math.max(project.startDaysAgo, 1)),
        updatedAt: subDays(now, Math.max(0, Math.min(project.startDaysAgo, 3))),
      })),
    )
    .returning({ id: projects.id });
  const projectId = new Map(SEED_PROJECTS.map((project, index) => [project.key, projectRows[index].id]));

  /* -------------------------------- Tasks -------------------------------- */
  await tx.insert(tasks).values(
    SEED_TASKS.map((task, index) => {
      const due = task.dueInDays === null ? null : addDays(now, task.dueInDays);
      const done = task.status === "done";
      return {
        userId: user.id,
        projectId: task.project ? (projectId.get(task.project) ?? null) : null,
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        priority: task.priority,
        dueDate: due ? d(due) : null,
        estimatedHours: task.estimatedHours === undefined ? null : task.estimatedHours.toFixed(2),
        position: index,
        completedAt: done ? subDays(due ?? now, 1) : null,
        isDemo: true,
        createdAt: subDays(now, done ? 20 + ((index * 7) % 40) : 2 + ((index * 5) % 50)),
        updatedAt: done ? subDays(due ?? now, 1) : subDays(now, index % 4),
      };
    }),
  );

  /* ------------------------------- Invoices ------------------------------ */
  const sorted = [...SEED_INVOICES].sort((a, b) => b.issueDaysAgo - a.issueDaysAgo);
  const paymentValues: (typeof payments.$inferInsert)[] = [];
  const invoiceRefs: { id: string; number: string; clientKey: string; total: number; currency: Currency; status: InvoiceStatus }[] = [];

  for (const [index, invoice] of sorted.entries()) {
    const issueDate = subDays(now, invoice.issueDaysAgo);
    const dueDate = addDays(issueDate, invoice.termsDays);
    const subtotal = roundMoney(invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    const taxRate = invoice.taxRate ?? 0;
    const taxAmount = roundMoney((subtotal * taxRate) / 100);
    const discount = invoice.discount ?? 0;
    const total = roundMoney(subtotal + taxAmount - discount);
    const amountPaid = roundMoney((invoice.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0));
    const sequence = index + 1;
    const number = `${user.invoicePrefix}-${String(sequence).padStart(4, "0")}`;
    const lastPayment = invoice.payments?.at(-1);

    const [row] = await tx
      .insert(invoices)
      .values({
        userId: user.id,
        clientId: clientId.get(invoice.client)!,
        projectId: invoice.project ? (projectId.get(invoice.project) ?? null) : null,
        sequence,
        number,
        status: invoice.status,
        currency: invoice.currency,
        issueDate: d(issueDate),
        dueDate: d(dueDate),
        subtotal: money(subtotal),
        taxRate: taxRate.toFixed(2),
        taxAmount: money(taxAmount),
        discount: money(discount),
        total: money(total),
        amountPaid: money(amountPaid),
        notes: invoice.notes ?? null,
        terms: user.paymentInstructions ?? null,
        sentAt: invoice.status === "draft" ? null : issueDate,
        paidAt: invoice.status === "paid" && lastPayment ? addDays(issueDate, lastPayment.daysAfterIssue) : null,
        overdueNotifiedAt: invoice.status === "overdue" ? dueDate : null,
        isDemo: true,
        createdAt: issueDate,
        updatedAt: lastPayment ? addDays(issueDate, lastPayment.daysAfterIssue) : issueDate,
      })
      .returning({ id: invoices.id });

    invoiceRefs.push({ id: row.id, number, clientKey: invoice.client, total, currency: invoice.currency, status: invoice.status });

    await tx.insert(invoiceItems).values(
      invoice.items.map((item, position) => ({
        invoiceId: row.id,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: money(item.unitPrice),
        amount: money(item.quantity * item.unitPrice),
        position,
      })),
    );

    for (const payment of invoice.payments ?? []) {
      paymentValues.push({
        userId: user.id,
        invoiceId: row.id,
        clientId: clientId.get(invoice.client) ?? null,
        amount: money(payment.amount),
        currency: invoice.currency,
        method: payment.method,
        paidAt: d(addDays(issueDate, payment.daysAfterIssue)),
        reference: payment.reference ?? null,
        notes: null,
        isDemo: true,
        createdAt: addDays(issueDate, payment.daysAfterIssue),
      });
    }
  }

  if (paymentValues.length) await tx.insert(payments).values(paymentValues);

  /* ------------------------------- Portfolio ----------------------------- */
  await tx.insert(portfolioItems).values(
    SEED_PORTFOLIO.map((item, position) => ({
      userId: user.id,
      clientId: item.client ? (clientId.get(item.client) ?? null) : null,
      projectId: item.project ? (projectId.get(item.project) ?? null) : null,
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags,
      imageUrl: null,
      liveUrl: item.liveUrl,
      repoUrl: null,
      gradient: item.gradient,
      featured: item.featured,
      visibility: "public" as const,
      completedOn: item.completedDaysAgo === null ? null : d(subDays(now, item.completedDaysAgo)),
      position,
      isDemo: true,
      createdAt: subDays(now, item.completedDaysAgo ?? 3),
    })),
  );

  /* ----------------------------- Notifications --------------------------- */
  const overdueAtlas = invoiceRefs.find((ref) => ref.clientKey === "atlas" && ref.status === "overdue");
  const overdueOrbit = invoiceRefs.find((ref) => ref.clientKey === "orbit" && ref.status === "overdue");
  const paidKarachi = invoiceRefs.find((ref) => ref.clientKey === "karachi-eats" && ref.status === "paid");

  await tx.insert(notifications).values([
    {
      userId: user.id,
      type: "success",
      title: `Welcome to SkillOrbit, ${user.name.split(" ")[0]}!`,
      body: "We added a demo workspace so you can explore. Remove it anytime from Settings → Data.",
      href: "/settings?tab=data",
      createdAt: now,
    },
    {
      userId: user.id,
      type: "invoice",
      title: `Invoice ${overdueAtlas?.number ?? ""} is overdue`,
      body: "Atlas Architects · $1,800.00 was due 12 days ago. Consider sending a reminder.",
      href: overdueAtlas ? `/invoices/${overdueAtlas.id}` : "/invoices",
      createdAt: subDays(now, 1),
    },
    {
      userId: user.id,
      type: "invoice",
      title: `Invoice ${overdueOrbit?.number ?? ""} is overdue`,
      body: "Orbit Learning · $1,500.00 was due 4 days ago.",
      href: overdueOrbit ? `/invoices/${overdueOrbit.id}` : "/invoices",
      createdAt: subDays(now, 4),
    },
    {
      userId: user.id,
      type: "payment",
      title: "Payment received — Rs 260,000",
      body: `Karachi Eats paid invoice ${paidKarachi?.number ?? ""} via bank transfer.`,
      href: paidKarachi ? `/invoices/${paidKarachi.id}` : "/invoices",
      readAt: subDays(now, 18),
      createdAt: subDays(now, 21),
    },
    {
      userId: user.id,
      type: "task",
      title: "2 tasks are due today",
      body: "Order acceptance & navigation hand-off · Follow up on overdue invoice",
      href: "/tasks?due=today",
      createdAt: now,
    },
    {
      userId: user.id,
      type: "client",
      title: "New lead: Sunrise Textiles",
      body: "Faisal Khan requested a proposal for a B2B product catalogue website.",
      href: `/clients/${clientId.get("sunrise")}`,
      readAt: subDays(now, 5),
      createdAt: subDays(now, 6),
    },
  ]);

  /* ------------------------------- Activity ------------------------------ */
  await tx.insert(activities).values([
    { userId: user.id, action: "created", entityType: "client", entityId: clientId.get("sunrise"), title: "Added client Sunrise Textiles", createdAt: subDays(now, 6) },
    { userId: user.id, action: "sent", entityType: "invoice", entityId: invoiceRefs.find((r) => r.clientKey === "northwind" && r.status === "sent")?.id, title: "Sent invoice to Northwind Fintech", meta: { amount: "$1,200.00" }, createdAt: subDays(now, 4) },
    { userId: user.id, action: "completed", entityType: "task", title: "Completed “Sprint 3: Grading workflow”", createdAt: subDays(now, 8) },
    { userId: user.id, action: "sent", entityType: "invoice", entityId: invoiceRefs.find((r) => r.clientKey === "karachi-eats" && r.status === "sent")?.id, title: "Sent invoice to Karachi Eats", meta: { amount: "Rs 195,000" }, createdAt: subDays(now, 2) },
    { userId: user.id, action: "created", entityType: "project", entityId: projectId.get("bloom-launch"), title: "Created project Packaging & Launch Campaign", createdAt: subDays(now, 9) },
    { userId: user.id, action: "payment", entityType: "payment", title: "Recorded payment of $1,500.00 from Orbit Learning", createdAt: subDays(now, 14) },
    { userId: user.id, action: "completed", entityType: "task", title: "Completed “Publish article: 'Open banking in 2026'”", createdAt: subDays(now, 6) },
    { userId: user.id, action: "created", entityType: "portfolio", title: "Published “Lumen Health — Patient Portal” to portfolio", createdAt: subDays(now, 10) },
  ]);

  await tx.update(users).set({ demoSeededAt: now }).where(eq(users.id, user.id));
}

export const DEMO_SUMMARY = {
  clients: SEED_CLIENTS.length,
  projects: SEED_PROJECTS.length,
  tasks: SEED_TASKS.length,
  invoices: SEED_INVOICES.length,
  portfolio: SEED_PORTFOLIO.length,
};
