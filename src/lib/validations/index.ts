import { z } from "zod";
import {
  billingTypeEnum,
  clientStatusEnum,
  currencyEnum,
  invoiceStatusEnum,
  paymentMethodEnum,
  priorityEnum,
  projectStatusEnum,
  taskStatusEnum,
  visibilityEnum,
} from "@/db/schema";

/* ------------------------------ Primitives -------------------------------- */

const trimmed = (max: number, label = "This field") =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`);

const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value.toLowerCase() : null))
  .refine((value) => value === null || z.email().safeParse(value).success, "Enter a valid email address");

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    if (!value) return null;
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  })
  .refine((value) => value === null || z.url().safeParse(value).success, "Enter a valid URL");

const optionalDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date");

const requiredDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const moneyInput = z.coerce
  .number({ error: "Enter a valid amount" })
  .min(0, "Amount cannot be negative")
  .max(999_999_999, "Amount is too large");

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
  })
  .refine((value) => value === null || (!Number.isNaN(value) && value >= 0), "Enter a valid amount");

export const tagsInput = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => {
    const list = Array.isArray(value) ? value : (value ?? "").split(",");
    return Array.from(new Set(list.map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);
  });

const uuid = z.uuid("Invalid identifier");
const optionalUuid = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || z.uuid().safeParse(value).success, "Invalid selection");

export const currencySchema = z.enum(currencyEnum.enumValues);

/* --------------------------------- Auth ----------------------------------- */

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const registerSchema = z.object({
  name: trimmed(80, "Name").min(2, "Enter your full name"),
  email: z.email("Enter a valid email address").max(160).transform((v) => v.toLowerCase()),
  password: passwordSchema,
  profession: trimmed(80, "Profession").min(2, "Tell us what you do"),
  baseCurrency: currencySchema.default("USD"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

/* -------------------------------- Clients --------------------------------- */

export const clientSchema = z.object({
  name: trimmed(120, "Name").min(2, "Client name is required"),
  company: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  website: optionalUrl,
  country: optionalText(80),
  city: optionalText(80),
  address: optionalText(240),
  notes: optionalText(2000),
  status: z.enum(clientStatusEnum.enumValues).default("active"),
  currency: currencySchema.default("USD"),
  tags: tagsInput,
});
export type ClientInput = z.input<typeof clientSchema>;

/* -------------------------------- Projects -------------------------------- */

export const projectSchema = z
  .object({
    name: trimmed(140, "Project name").min(2, "Project name is required"),
    description: optionalText(4000),
    clientId: optionalUuid,
    status: z.enum(projectStatusEnum.enumValues).default("planning"),
    priority: z.enum(priorityEnum.enumValues).default("medium"),
    billingType: z.enum(billingTypeEnum.enumValues).default("fixed"),
    budget: optionalMoney,
    hourlyRate: optionalMoney,
    currency: currencySchema.default("USD"),
    startDate: optionalDate,
    dueDate: optionalDate,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour").default("#6366f1"),
    tags: tagsInput,
  })
  .refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, {
    message: "Due date must be after the start date",
    path: ["dueDate"],
  });
export type ProjectInput = z.input<typeof projectSchema>;

/* --------------------------------- Tasks ---------------------------------- */

export const taskSchema = z.object({
  title: trimmed(200, "Title").min(2, "Task title is required"),
  description: optionalText(4000),
  projectId: optionalUuid,
  status: z.enum(taskStatusEnum.enumValues).default("todo"),
  priority: z.enum(priorityEnum.enumValues).default("medium"),
  dueDate: optionalDate,
  estimatedHours: optionalMoney,
});
export type TaskInput = z.input<typeof taskSchema>;

export const quickTaskSchema = z.object({
  title: trimmed(200, "Title").min(2, "Task title is required"),
  projectId: optionalUuid,
  dueDate: optionalDate,
  priority: z.enum(priorityEnum.enumValues).default("medium"),
});

/* -------------------------------- Invoices -------------------------------- */

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: trimmed(300, "Description").min(1, "Describe the line item"),
  quantity: z.coerce.number({ error: "Enter a quantity" }).min(0.01, "Quantity must be greater than 0").max(99999),
  unitPrice: z.coerce.number({ error: "Enter a price" }).min(0, "Price cannot be negative").max(999_999_999),
});

export const invoiceSchema = z
  .object({
    clientId: uuid.or(z.literal("")).refine((v) => v !== "", "Select a client"),
    projectId: optionalUuid,
    currency: currencySchema.default("USD"),
    issueDate: requiredDate,
    dueDate: requiredDate,
    taxRate: z.coerce.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%").default(0),
    discount: z.coerce.number().min(0, "Discount cannot be negative").max(999_999_999).default(0),
    notes: optionalText(2000),
    terms: optionalText(2000),
    status: z.enum(["draft", "sent"]).default("draft"),
    items: z.array(invoiceItemSchema).min(1, "Add at least one line item").max(50),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Due date cannot be before the issue date",
    path: ["dueDate"],
  });
export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export const invoiceStatusSchema = z.enum(invoiceStatusEnum.enumValues);

/* -------------------------------- Payments -------------------------------- */

export const paymentSchema = z.object({
  invoiceId: optionalUuid,
  clientId: optionalUuid,
  amount: moneyInput.refine((v) => v > 0, "Amount must be greater than 0"),
  currency: currencySchema.default("USD"),
  method: z.enum(paymentMethodEnum.enumValues).default("bank_transfer"),
  paidAt: requiredDate,
  reference: optionalText(120),
  notes: optionalText(1000),
});
export type PaymentInput = z.input<typeof paymentSchema>;

/* -------------------------------- Portfolio ------------------------------- */

export const portfolioSchema = z.object({
  title: trimmed(140, "Title").min(2, "Title is required"),
  description: optionalText(3000),
  category: trimmed(60, "Category").min(1, "Pick a category"),
  tags: tagsInput,
  imageUrl: optionalUrl,
  liveUrl: optionalUrl,
  repoUrl: optionalUrl,
  clientId: optionalUuid,
  projectId: optionalUuid,
  gradient: z.string().min(1).default("from-indigo-500 via-purple-500 to-pink-500"),
  featured: z.coerce.boolean().default(false),
  visibility: z.enum(visibilityEnum.enumValues).default("public"),
  completedOn: optionalDate,
});
export type PortfolioInput = z.input<typeof portfolioSchema>;

/* -------------------------------- Settings -------------------------------- */

export const profileSchema = z.object({
  name: trimmed(80, "Name").min(2, "Enter your name"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be 32 characters or fewer")
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use letters, numbers and dashes only"),
  profession: trimmed(80, "Profession").min(2, "Tell us what you do"),
  headline: optionalText(140),
  bio: optionalText(1200),
  skills: tagsInput,
  location: optionalText(100),
  website: optionalUrl,
  avatarUrl: optionalUrl,
  portfolioPublic: z.coerce.boolean().default(true),
});
export type ProfileInput = z.input<typeof profileSchema>;

export const businessSchema = z.object({
  businessName: optionalText(120),
  businessAddress: optionalText(400),
  taxId: optionalText(60),
  baseCurrency: currencySchema,
  usdToPkrRate: z.coerce.number().min(1, "Rate must be at least 1").max(10000, "Rate looks wrong"),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(365),
  invoicePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Prefix is required")
    .max(8, "Keep the prefix short")
    .regex(/^[A-Z0-9-]+$/, "Letters, numbers and dashes only"),
  invoiceNotes: optionalText(2000),
  paymentInstructions: optionalText(2000),
});
export type BusinessInput = z.input<typeof businessSchema>;

export const accountEmailSchema = z.object({
  email: z.email("Enter a valid email address").max(160).transform((v) => v.toLowerCase()),
  currentPassword: z.string().min(1, "Enter your current password"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const claimGuestSchema = z
  .object({
    email: z.email("Enter a valid email address").max(160).transform((v) => v.toLowerCase()),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password"),
  confirmation: z.literal("DELETE", { error: "Type DELETE to confirm" }),
});

/* --------------------------------- Helpers -------------------------------- */

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function flattenErrors(error: z.ZodError): { error: string; fieldErrors: FieldErrors } {
  const flattened = z.flattenError(error);
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const first = error.issues[0]?.message ?? flattened.formErrors[0] ?? "Please check the form for errors";
  return { error: first, fieldErrors };
}
