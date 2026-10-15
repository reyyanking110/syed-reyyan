import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const currencyEnum = pgEnum("currency", ["USD", "PKR"]);
export const clientStatusEnum = pgEnum("client_status", ["lead", "active", "inactive"]);
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
]);
export const billingTypeEnum = pgEnum("billing_type", ["fixed", "hourly", "retainer"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "done"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "bank_transfer",
  "card",
  "paypal",
  "payoneer",
  "wise",
  "jazzcash",
  "easypaisa",
  "cash",
  "other",
]);
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "info",
  "success",
  "warning",
  "invoice",
  "payment",
  "task",
  "project",
  "client",
]);

/* -------------------------------------------------------------------------- */
/*                                Shared columns                              */
/* -------------------------------------------------------------------------- */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const money = (name: string) => numeric(name, { precision: 14, scale: 2 });

/* -------------------------------------------------------------------------- */
/*                                   Users                                    */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    username: text("username").notNull(),
    profession: text("profession").notNull().default("Freelancer"),
    headline: text("headline"),
    bio: text("bio"),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    location: text("location"),
    website: text("website"),
    avatarUrl: text("avatar_url"),
    // Business / invoicing defaults
    businessName: text("business_name"),
    businessAddress: text("business_address"),
    taxId: text("tax_id"),
    baseCurrency: currencyEnum("base_currency").notNull().default("USD"),
    usdToPkrRate: numeric("usd_to_pkr_rate", { precision: 12, scale: 4 }).notNull().default("278.5000"),
    defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
    defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(14),
    invoicePrefix: text("invoice_prefix").notNull().default("INV"),
    invoiceNotes: text("invoice_notes"),
    paymentInstructions: text("payment_instructions"),
    // Portfolio
    portfolioPublic: boolean("portfolio_public").notNull().default(true),
    // Account state
    isGuest: boolean("is_guest").notNull().default(false),
    demoSeededAt: timestamp("demo_seeded_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    uniqueIndex("users_username_unique").on(sql`lower(${table.username})`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Clients                                   */
/* -------------------------------------------------------------------------- */

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    country: text("country"),
    city: text("city"),
    address: text("address"),
    notes: text("notes"),
    status: clientStatusEnum("status").notNull().default("active"),
    currency: currencyEnum("currency").notNull().default("USD"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    color: text("color").notNull().default("#6366f1"),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("clients_user_id_idx").on(table.userId),
    index("clients_user_status_idx").on(table.userId, table.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Projects                                  */
/* -------------------------------------------------------------------------- */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("planning"),
    priority: priorityEnum("priority").notNull().default("medium"),
    billingType: billingTypeEnum("billing_type").notNull().default("fixed"),
    budget: money("budget"),
    hourlyRate: money("hourly_rate"),
    currency: currencyEnum("currency").notNull().default("USD"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    color: text("color").notNull().default("#6366f1"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    index("projects_client_id_idx").on(table.clientId),
    index("projects_user_status_idx").on(table.userId, table.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Tasks                                    */
/* -------------------------------------------------------------------------- */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: priorityEnum("priority").notNull().default("medium"),
    dueDate: date("due_date"),
    estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
    position: integer("position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("tasks_user_id_idx").on(table.userId),
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_user_status_idx").on(table.userId, table.status),
    index("tasks_user_due_idx").on(table.userId, table.dueDate),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Invoices                                  */
/* -------------------------------------------------------------------------- */

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    sequence: integer("sequence").notNull(),
    number: text("number").notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    currency: currencyEnum("currency").notNull().default("USD"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    subtotal: money("subtotal").notNull().default("0.00"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
    taxAmount: money("tax_amount").notNull().default("0.00"),
    discount: money("discount").notNull().default("0.00"),
    total: money("total").notNull().default("0.00"),
    amountPaid: money("amount_paid").notNull().default("0.00"),
    notes: text("notes"),
    terms: text("terms"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    overdueNotifiedAt: timestamp("overdue_notified_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invoices_user_sequence_unique").on(table.userId, table.sequence),
    index("invoices_user_id_idx").on(table.userId),
    index("invoices_client_id_idx").on(table.clientId),
    index("invoices_user_status_idx").on(table.userId, table.status),
    index("invoices_user_issue_date_idx").on(table.userId, table.issueDate),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
    unitPrice: money("unit_price").notNull().default("0.00"),
    amount: money("amount").notNull().default("0.00"),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("invoice_items_invoice_id_idx").on(table.invoiceId)],
);

/* -------------------------------------------------------------------------- */
/*                                  Payments                                  */
/* -------------------------------------------------------------------------- */

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    amount: money("amount").notNull(),
    currency: currencyEnum("currency").notNull().default("USD"),
    method: paymentMethodEnum("method").notNull().default("bank_transfer"),
    paidAt: date("paid_at").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_user_id_idx").on(table.userId),
    index("payments_invoice_id_idx").on(table.invoiceId),
    index("payments_user_paid_at_idx").on(table.userId, table.paidAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Portfolio                                  */
/* -------------------------------------------------------------------------- */

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull().default("General"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    imageUrl: text("image_url"),
    liveUrl: text("live_url"),
    repoUrl: text("repo_url"),
    gradient: text("gradient").notNull().default("from-indigo-500 via-purple-500 to-pink-500"),
    featured: boolean("featured").notNull().default(false),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    completedOn: date("completed_on"),
    position: integer("position").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("portfolio_items_user_id_idx").on(table.userId)],
);

/* -------------------------------------------------------------------------- */
/*                         Notifications & activity                           */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_user_unread_idx").on(table.userId, table.readAt),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    title: text("title").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activities_user_created_idx").on(table.userId, table.createdAt)],
);

/* -------------------------------------------------------------------------- */
/*                                 Relations                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  clients: many(clients),
  projects: many(projects),
  tasks: many(tasks),
  invoices: many(invoices),
  payments: many(payments),
  portfolioItems: many(portfolioItems),
  notifications: many(notifications),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  projects: many(projects),
  invoices: many(invoices),
  payments: many(payments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  tasks: many(tasks),
  invoices: many(invoices),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  client: one(clients, { fields: [payments.clientId], references: [clients.id] }),
}));

export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  user: one(users, { fields: [portfolioItems.userId], references: [users.id] }),
  client: one(clients, { fields: [portfolioItems.clientId], references: [clients.id] }),
  project: one(projects, { fields: [portfolioItems.projectId], references: [projects.id] }),
}));

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type NewPortfolioItem = typeof portfolioItems.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type Activity = typeof activities.$inferSelect;

export type Currency = (typeof currencyEnum.enumValues)[number];
export type ClientStatus = (typeof clientStatusEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type BillingType = (typeof billingTypeEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type Visibility = (typeof visibilityEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
