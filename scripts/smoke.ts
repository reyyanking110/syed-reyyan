import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

async function main() {
  const { db, pool } = await import("../src/db");
  const { users } = await import("../src/db/schema");
  const { seedDemoWorkspace } = await import("../src/db/seed-demo");
  const { hashPassword, verifyPassword } = await import("../src/lib/auth/password");
  const { getDashboardData } = await import("../src/lib/queries/dashboard");
  const { getAnalyticsData } = await import("../src/lib/queries/analytics");
  const { listClients, getClientDetail } = await import("../src/lib/queries/clients");
  const { listProjects, getProjectDetail } = await import("../src/lib/queries/projects");
  const { listTasks, getTaskSummary } = await import("../src/lib/queries/tasks");
  const { listInvoices, getInvoiceDetail, getInvoiceSummary } = await import("../src/lib/queries/invoices");
  const { listPortfolioItems, getPublicPortfolio } = await import("../src/lib/queries/portfolio");
  const { globalSearch } = await import("../src/lib/queries/search");
  const { eq } = await import("drizzle-orm");

  const email = `smoke-${Date.now()}@test.local`;
  const hash = await hashPassword("password123");
  console.log("verify ok:", await verifyPassword("password123", hash), "bad:", await verifyPassword("nope", hash));

  const user = await db.transaction(async (tx) => {
    const [u] = await tx.insert(users).values({ email, passwordHash: hash, name: "Smoke Tester", username: `smoke-${Date.now()}`, profession: "Designer", baseCurrency: "USD" }).returning();
    await seedDemoWorkspace(tx, u);
    return u;
  });
  console.log("seeded user", user.id);

  const dash = await getDashboardData(user);
  console.log("KPIs", dash.kpis);
  console.log("series", dash.revenueSeries.map((p) => `${p.label}:${p.revenue}`).join(" "));
  console.log("recent invoices", dash.recentInvoices.length, "upcoming tasks", dash.upcomingTasks.length, "active projects", dash.activeProjects.length, "activity", dash.recentActivity.length);

  const analytics = await getAnalyticsData(user, "12m");
  console.log("analytics totals", analytics.totals);
  console.log("by client", analytics.revenueByClient.slice(0, 3));
  console.log("by currency", analytics.revenueByCurrency);
  console.log("invoice status", analytics.invoiceStatus);
  console.log("throughput", analytics.taskThroughput.map((w) => `${w.label}:${w.completed}/${w.created}`).join(" "));

  const cl = await listClients(user, { q: "lumen" });
  console.log("clients search", cl.map((c) => [c.company, c.projectCount, c.totalBilledBase, c.outstandingBase]));
  const detail = await getClientDetail(user, cl[0].id);
  console.log("client detail stats", detail?.stats, "invoices", detail?.invoices.length);

  const pr = await listProjects(user, { status: "active" });
  console.log("active projects", pr.map((p) => [p.name, p.progress, p.taskCount, p.invoicedTotal]));
  const pd = await getProjectDetail(user, pr[0].id);
  console.log("project detail", pd?.stats);

  const tk = await listTasks(user.id, { due: "today" });
  console.log("tasks due today", tk.map((t) => t.title));
  console.log("task summary", await getTaskSummary(user.id));

  const inv = await listInvoices(user, { status: "open" });
  console.log("open invoices", inv.map((i) => [i.number, i.status, i.balanceDue, i.client.company]));
  const invd = await getInvoiceDetail(user.id, inv[0].id);
  console.log("invoice detail", invd?.number, invd?.items.length, invd?.payments.length);
  console.log("invoice summary", await getInvoiceSummary(user));

  const pf = await listPortfolioItems(user.id, {});
  console.log("portfolio", pf.length, pf[0].title);
  const pub = await getPublicPortfolio(user.username);
  console.log("public portfolio", pub?.owner.name, pub?.items.length, pub?.stats);

  console.log("search", (await globalSearch(user.id, "north")).map((r) => `${r.type}:${r.title}`));

  await db.delete(users).where(eq(users.id, user.id));
  console.log("cleaned up");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
