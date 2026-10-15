#!/usr/bin/env node
/**
 * Applies pending SQL migrations from ./drizzle to the database in DATABASE_URL.
 * Safe to run repeatedly (drizzle tracks applied migrations in `drizzle.__drizzle_migrations`).
 */
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnv({ path: [".env.local", ".env"] });

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  console.log("▸ Applying migrations …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✔ Database is up to date");
  await pool.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
