import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runSync } from "@/lib/sync";
import { FootballDataError } from "@/lib/football-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authorize(req: NextRequest): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true };
  }

  const user = await getSessionUser();
  if (user?.is_admin) return { ok: true };

  return { ok: false, status: 401, reason: "Non autorisé" };
}

async function handle(req: NextRequest) {
  const auth = await authorize(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });
  }
  try {
    const report = await runSync();
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof FootballDataError) {
      return NextResponse.json(
        { ok: false, error: err.message, status: err.status },
        { status: 502 },
      );
    }
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
