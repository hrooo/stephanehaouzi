import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ZlatanQuote } from "@/components/ZlatanQuote";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import {
  computeLeaderboard,
  getGroupLockAt,
  isGroupStageLocked,
  scoreKnockoutPrediction,
} from "@/lib/scoring";
import { getRemindersFor, type Reminder } from "@/lib/reminders";
import { zlatanCommentForKnockout } from "@/lib/zlatan";

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

  const { reminders } = await getRemindersFor(user.id);
  const recentResults = await query<{
    id: number;
    label: string;
    score_a: number;
    score_b: number;
    qualifier_team_id: number;
    name_a: string;
    name_b: string;
    flag_a: string;
    flag_b: string;
    pred_score_a: number | null;
    pred_score_b: number | null;
    pred_qualifier: number | null;
  }>(
    `select m.id, m.label, m.score_a, m.score_b, m.qualifier_team_id,
            ta.name as name_a, tb.name as name_b,
            ta.flag as flag_a, tb.flag as flag_b,
            kp.score_a as pred_score_a,
            kp.score_b as pred_score_b,
            kp.qualifier_team_id as pred_qualifier
       from knockout_matches m
       join teams ta on ta.id = m.team_a_id
       join teams tb on tb.id = m.team_b_id
       left join knockout_predictions kp
         on kp.match_id = m.id and kp.user_id = $1
       where m.score_a is not null and m.score_b is not null
       order by m.kickoff_at desc
       limit 3`,
    [user.id],
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
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href="/profile" className="font-medium text-brand hover:underline">
              Modifier mon avatar →
            </Link>
            <Link href="/aide" className="font-medium text-brand hover:underline">
              Comment ça marche ? →
            </Link>
          </div>
        </div>
      </section>

      {reminders.length > 0 ? (
        <section className="space-y-3">
          {reminders.map((r, i) => (
            <ReminderBanner key={i} reminder={r} />
          ))}
        </section>
      ) : null}

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

      {recentResults.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark">Résultats récents</h2>
          <div className="mt-3 space-y-4">
            {recentResults.map((r) => {
              const points =
                r.pred_score_a != null &&
                r.pred_score_b != null &&
                r.pred_qualifier != null
                  ? scoreKnockoutPrediction(
                      {
                        score_a: r.pred_score_a,
                        score_b: r.pred_score_b,
                        qualifier_team_id: r.pred_qualifier,
                      },
                      {
                        score_a: r.score_a,
                        score_b: r.score_b,
                        qualifier_team_id: r.qualifier_team_id,
                      },
                    )
                  : 0;
              const zlatan =
                r.pred_score_a != null
                  ? zlatanCommentForKnockout(points, {
                      matchId: r.id,
                      userId: user.id,
                    })
                  : null;
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium uppercase tracking-wide">
                      {r.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        points >= 3
                          ? "bg-emerald-100 text-emerald-700"
                          : points >= 1
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {points} pt{points !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-800">
                    {r.flag_a} {r.name_a} {r.score_a} – {r.score_b}{" "}
                    {r.flag_b} {r.name_b}
                  </p>
                  {zlatan ? (
                    <div className="mt-2">
                      <ZlatanQuote comment={zlatan} points={points} />
                    </div>
                  ) : (
                    <p className="mt-1 text-xs italic text-slate-500">
                      Tu n&apos;avais pas pronostiqué ce match.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
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

function ReminderBanner({ reminder }: { reminder: Reminder }) {
  const palette = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    urgent: "border-red-300 bg-red-50 text-red-900",
  } as const;
  const ctaPalette = {
    info: "bg-blue-600 hover:bg-blue-700",
    warn: "bg-amber-600 hover:bg-amber-700",
    urgent: "bg-red-600 hover:bg-red-700",
  } as const;
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border-2 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${palette[reminder.level]}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {reminder.icon}
        </span>
        <div>
          <p className="font-semibold">{reminder.title}</p>
          <p className="mt-0.5 text-sm">{reminder.body}</p>
        </div>
      </div>
      <Link
        href={reminder.href}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow transition ${ctaPalette[reminder.level]}`}
      >
        {reminder.cta} →
      </Link>
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
