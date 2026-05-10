import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function buildPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL n'est pas défini. Renseigne-le dans .env.local",
    );
  }

  const needsSsl =
    /sslmode=require/i.test(connectionString) ||
    /\.neon\.tech/.test(connectionString) ||
    /\.supabase\.co/.test(connectionString) ||
    /\.vercel-storage\.com/.test(connectionString) ||
    /\.render\.com/.test(connectionString);

  return new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}

export const pool: Pool = global.__pgPool ?? buildPool();

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}

export type DbRow = Record<string, unknown>;

export async function query<T extends DbRow = DbRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as never);
  return result.rows;
}

export async function queryOne<T extends DbRow = DbRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
