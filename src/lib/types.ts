import type {
  Activity,
  Client,
  Currency,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Notification,
  Payment,
  PortfolioItem,
  Project,
  Task,
} from "@/db/schema";

export type ClientListItem = Client & {
  projectCount: number;
  activeProjectCount: number;
  invoiceCount: number;
  /** Lifetime billed, converted to the user's base currency. */
  totalBilledBase: number;
  /** Outstanding (unpaid) balance, converted to the user's base currency. */
  outstandingBase: number;
  /** Collected, converted to the user's base currency. */
  paidBase: number;
};

export type ClientOption = { id: string; name: string; company: string | null; currency: Currency; color: string };

export type ProjectListItem = Project & {
  client: Pick<Client, "id" | "name" | "company" | "color"> | null;
  taskCount: number;
  doneTaskCount: number;
  invoicedTotal: number;
  paidTotal: number;
  progress: number;
};

export type ProjectOption = {
  id: string;
  name: string;
  color: string;
  currency: Currency;
  clientId: string | null;
  status: Project["status"];
};

export type TaskListItem = Task & {
  project: Pick<Project, "id" | "name" | "color"> | null;
};

export type InvoiceListItem = Invoice & {
  client: Pick<Client, "id" | "name" | "company" | "color">;
  project: Pick<Project, "id" | "name"> | null;
  totalNumber: number;
  amountPaidNumber: number;
  balanceDue: number;
};

export type InvoiceDetail = Invoice & {
  client: Client;
  project: Pick<Project, "id" | "name" | "color"> | null;
  items: InvoiceItem[];
  payments: Payment[];
  totalNumber: number;
  amountPaidNumber: number;
  balanceDue: number;
};

export type PaymentListItem = Payment & {
  invoice: Pick<Invoice, "id" | "number"> | null;
  client: Pick<Client, "id" | "name" | "company"> | null;
};

export type PortfolioListItem = PortfolioItem & {
  client: Pick<Client, "id" | "name" | "company"> | null;
  project: Pick<Project, "id" | "name"> | null;
};

export type NotificationItem = Notification;
export type ActivityItem = Activity;

export type MonthlyPoint = { month: string; label: string; revenue: number; invoiced: number };

export type DashboardData = {
  baseCurrency: Currency;
  kpis: {
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueChange: number;
    outstanding: number;
    overdueCount: number;
    overdueAmount: number;
    activeProjects: number;
    completedProjectsThisMonth: number;
    tasksDueThisWeek: number;
    tasksOverdue: number;
    activeClients: number;
    newClientsThisMonth: number;
  };
  revenueSeries: MonthlyPoint[];
  recentInvoices: InvoiceListItem[];
  upcomingTasks: TaskListItem[];
  activeProjects: ProjectListItem[];
  recentActivity: ActivityItem[];
};

export type AnalyticsData = {
  baseCurrency: Currency;
  range: { from: string; to: string; label: string; months: number };
  totals: {
    revenue: number;
    previousRevenue: number;
    revenueChange: number;
    invoiced: number;
    outstanding: number;
    overdue: number;
    averageInvoice: number;
    averageDaysToPay: number | null;
    collectionRate: number;
    invoicesCount: number;
    paidInvoicesCount: number;
    tasksCompleted: number;
    projectsCompleted: number;
  };
  revenueSeries: MonthlyPoint[];
  revenueByClient: { clientId: string; name: string; company: string | null; color: string; revenue: number; share: number }[];
  revenueByCurrency: { currency: Currency; amount: number; amountBase: number; share: number }[];
  invoiceStatus: { status: InvoiceStatus; count: number; amount: number }[];
  projectStatus: { status: Project["status"]; count: number }[];
  taskThroughput: { week: string; label: string; completed: number; created: number }[];
  paymentMethods: { method: Payment["method"]; amount: number; count: number }[];
  topProjects: { projectId: string; name: string; color: string; client: string | null; invoiced: number; paid: number; budget: number | null; currency: Currency }[];
};
