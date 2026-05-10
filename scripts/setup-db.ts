#!/usr/bin/env node --experimental-strip-types
/**
 * Initialise la base Postgres : crée les tables et insère les seeds.
 * Usage : DATABASE_URL=... npm run db:setup
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, "..", "sql");

const FILES = [
  "01_schema.sql",
  "02_seed_teams.sql",
  "03_seed_knockout.sql",
  "04_avatars_and_sync.sql",
] as const;

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local optionnel
  }
}

async function main() {
  loadEnvLocal();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL manquant.");
    process.exit(1);
  }
  const needsSsl =
    /sslmode=require/i.test(connectionString) ||
    /\.neon\.tech/.test(connectionString) ||
    /\.vercel-storage\.com/.test(connectionString) ||
    /\.render\.com/.test(connectionString);

  const pool = new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  for (const file of FILES) {
    const sql = readFileSync(join(sqlDir, file), "utf8");
    process.stdout.write(`▶ ${file} ... `);
    await pool.query(sql);
    console.log("ok");
  }

  console.log("\n✅ Base prête. Crée ton compte sur /signup — le 1er compte créé devient admin.");
  await pool.end();
}

main().catch((err) => {
  console.error("\n❌ Échec setup DB :", err.message);
  process.exit(1);
});
