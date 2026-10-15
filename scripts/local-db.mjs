#!/usr/bin/env node
/**
 * Boots a local PostgreSQL 17 server for development using `embedded-postgres`.
 *
 * In production you point `DATABASE_URL` at any managed Postgres (Neon, Supabase,
 * RDS, Railway, …) and never run this script. Locally it gives you a real Postgres
 * with zero system setup. Data is persisted in `.pgdata/` (git-ignored).
 *
 * Usage:  npm run db:local
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseDir = path.join(root, ".pgdata");
const port = Number(process.env.PGPORT ?? 5432);
const user = process.env.PGUSER ?? "postgres";
const password = process.env.PGPASSWORD ?? "postgres";
const database = process.env.PGDATABASE ?? "app_db";

const freshCluster = !existsSync(path.join(databaseDir, "PG_VERSION"));
if (freshCluster) mkdirSync(databaseDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  authMethod: "scram-sha-256",
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--no-locale"],
  onLog: () => {},
  onError: (message) => {
    const text = String(message);
    if (text.trim()) process.stderr.write(text.endsWith("\n") ? text : `${text}\n`);
  },
});

async function main() {
  if (freshCluster) {
    console.log("▸ Initialising new PostgreSQL cluster in .pgdata …");
    await pg.initialise();
  }
  await pg.start();

  // Create the application database if it does not exist yet.
  const client = pg.getPgClient("postgres");
  await client.connect();
  const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [database]);
  if (!rowCount) {
    await client.query(`create database "${database}"`);
    console.log(`▸ Created database "${database}"`);
  }
  await client.end();

  console.log(`✔ PostgreSQL ready at postgresql://${user}:***@127.0.0.1:${port}/${database}`);
  console.log("  Press Ctrl+C to stop.");

  const shutdown = async () => {
    console.log("\n▸ Stopping PostgreSQL …");
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Failed to start local PostgreSQL:", error);
  process.exit(1);
});
