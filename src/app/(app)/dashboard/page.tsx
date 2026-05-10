import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { computeLeaderboard, getGroupLockAt, isGroupStageLocked } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const lockAt = await getGroupLockAt();
  const locked = await isGroupStageLocked();

  const groupCount = await queryOne<{ n: string }>(
    `select count(*)::text as n from group_predictions where user_id = $1`,
    [user.id],
  );
  const knockoutCount = await queryOne<{ n: string }>(
    `select count(*)::text as n from knockout_predictions where user_id = $1`,
    [user.id],
  );
  const carre = await queryOne<{ user_id: string }>(
    `select user_id::text from carre_predictions where user_id = $1`,
    [user.id],
  );
  const totalGroups = await queryOne<{ n: string }>(
    `select count(distinct group_letter)::text as n from teams where group_letter is not null`,
  );
  const upcoming = await query<{
    id: number;
    label: string;
    kickoff_at: string;
    name_a: string | null;
    name_b: string | null;
    flag_a: string | null;
    flag_b: string | null;
  }>(
    `select m.id, m.label, m.kickoff_at,
            ta.name as name_a, tb.name as name_b,
            ta.flag as flag_a, tb.flag as flag_b
       from knockout_matches m
       left join teams ta on ta.id = m.team_a_id
       left join teams tb on tb.id = m.team_b_id
       where m.kickoff_at > now()
       order by m.kickoff_at asc
       limit 5`,
  );

  const board = await computeLeaderboard();
  const myRank = board.findIndex((b) => b.user_id === user.id);
  const me = myRank >= 0 ? board[myRank] : null;

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Avatar
          style={user.avatar_style}
          seed={user.avatar_seed ?? user.display_name}
          size="xl"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand-dark">
            Salut {user.display_name} 👋
          </h1>
          <p className="mt-1 text-slate-600">
            {locked
              ? "Le tournoi est lancé — les pronos de poule sont verrouillés."
              : `Pronos de poule + Carré d'As verrouillés le ${lockAt.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}.`}
          </p>
          <Link
            href="/profile"
            className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
          >
            Modifier mon avatar →
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Pronostics de poule"
          value={`${groupCount?.n ?? 0} / ${totalGroups?.n ?? 12}`}
          href="/predictions/groups"
          cta={locked ? "Voir mes pronos" : "Compléter"}
        />
        <StatCard
          title="Carré d'As"
          value={carre ? "Validé ✅" : "À faire"}
          href="/predictions/carre"
          cta={carre ? "Voir / modifier" : "Pronostiquer"}
        />
        <StatCard
          title="Pronostics élim."
          value={`${knockoutCount?.n ?? 0} matchs`}
          href="/predictions/knockout"
          cta="Pronostiquer"
        />
      </section>

      {me ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark">Mon score</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total" value={me.total} highlight />
            <Stat label="Poule" value={me.group_points} />
            <Stat label="Élim." value={me.knockout_points} />
            <Stat label="Carré d'As" value={me.carre_points} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Position actuelle :{" "}
            <strong>
              {myRank + 1}
              <sup>e</sup> / {board.length}
            </strong>{" "}
            ·{" "}
            <Link href="/leaderboard" className="text-brand hover:underline">
              voir le classement complet
            </Link>
          </p>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark">Prochains matchs élim.</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {upcoming.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <span className="font-medium text-slate-700">
                  {m.label} —{" "}
                  {m.name_a && m.name_b
                    ? `${m.flag_a} ${m.name_a} vs ${m.flag_b} ${m.name_b}`
                    : "équipes à confirmer"}
                </span>
                <span className="text-slate-500">
                  {new Date(m.kickoff_at).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
  cta,
}: {
  title: string;
  value: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand hover:shadow-md"
    >
      <div className="text-sm uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-brand-dark">{value}</div>
      <div className="mt-3 text-sm font-medium text-brand">{cta} →</div>
    </Link>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-4 py-3 ${
        highlight ? "bg-brand text-white" : "bg-slate-50 text-slate-800"
      }`}
    >
      <div className={`text-xs uppercase ${highlight ? "text-white/80" : "text-slate-500"}`}>
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
