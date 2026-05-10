import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import {
  computeLeaderboard,
  getPhaseCompletion,
  PHASES,
  PHASE_LABEL,
  type Phase,
} from "@/lib/scoring";

export const dynamic = "force-dynamic";

function isPhase(value: string | undefined): value is Phase {
  return !!value && (PHASES as readonly string[]).includes(value);
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const user = await requireUser();
  const { phase: phaseParam } = await searchParams;
  const through = isPhase(phaseParam) ? phaseParam : undefined;
  const board = await computeLeaderboard({ through });
  const completion = await getPhaseCompletion();

  const liveActive = !through;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Classement famille</h1>
          <p className="mt-1 text-sm text-slate-600">
            {through
              ? `Snapshot — ${PHASE_LABEL[through]}`
              : "Classement en direct (mis à jour à chaque résultat saisi)."}
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <PhasePill href="/leaderboard" active={liveActive} label="🔴 En direct" />
        {PHASES.map((p) => {
          const done = completion[p];
          return (
            <PhasePill
              key={p}
              href={`/leaderboard?phase=${p}`}
              active={through === p}
              label={`${done ? "✅" : "⏳"} ${PHASE_LABEL[p]}`}
              dim={!done}
            />
          );
        })}
      </nav>

      {through && !completion[through] ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          ⚠️ Cette phase n&apos;est pas encore terminée — le snapshot affiché ne tient
          compte que des résultats déjà saisis.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Place</th>
              <th className="px-4 py-3">Joueur</th>
              <th className="px-4 py-3 text-center">Poule</th>
              <th className="px-4 py-3 text-center">Élim.</th>
              <th className="px-4 py-3 text-center">Carré d&apos;As</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {board.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Personne n&apos;a encore rejoint.
                </td>
              </tr>
            ) : null}
            {board.map((row, i) => {
              const isMe = row.user_id === user.id;
              return (
                <tr
                  key={row.user_id}
                  className={
                    isMe
                      ? "bg-brand/5 font-semibold text-brand-dark"
                      : "border-t border-slate-100"
                  }
                >
                  <td className="px-4 py-3">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}e`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        style={row.avatar_style}
                        seed={row.avatar_seed ?? row.display_name}
                        size="sm"
                      />
                      <span>
                        {row.display_name} {isMe ? "(toi)" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {row.group_points}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {row.knockout_points}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {row.carre_points}
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold">
                    {row.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-700">Barème</h2>
        <ul className="space-y-1">
          <li>
            <strong>Phase de poule</strong> (top 2) : 3 pts dans l&apos;ordre · 2 pts dans le désordre · 1 pt avec 1 bon · 0 sinon
          </li>
          <li>
            <strong>Phase à élimination</strong> : 3 pts si bon qualifié + bon score · 1 pt si bon qualifié seul · 0 sinon (pas de cumul)
          </li>
          <li>
            <strong>Carré d&apos;As</strong> (avant tournoi) : 10 / 7 / 4 / 1 / 0 pts pour 4 / 3 / 2 / 1 / 0 demi-finalistes corrects (compté à partir des demi-finales)
          </li>
        </ul>
      </section>
    </div>
  );
}

function PhasePill({
  href,
  active,
  label,
  dim,
}: {
  href: string;
  active: boolean;
  label: string;
  dim?: boolean;
}) {
  const base = "rounded-full px-3 py-1.5 font-medium transition";
  const cls = active
    ? "bg-brand text-white shadow"
    : dim
      ? "bg-white text-slate-400 ring-1 ring-slate-200 hover:text-slate-600"
      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50";
  return (
    <Link href={href} className={`${base} ${cls}`}>
      {label}
    </Link>
  );
}
