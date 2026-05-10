import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  R32: "1/16e de finale",
  R16: "1/8e de finale",
  QF: "Quarts de finale",
  SF: "Demi-finales",
  "3RD": "Match pour la 3e place",
  F: "Finale",
};
const STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "F"];

type Match = {
  id: number;
  stage: string;
  label: string;
  kickoff_at: string;
  team_a_id: number | null;
  team_b_id: number | null;
  name_a: string | null;
  name_b: string | null;
  flag_a: string | null;
  flag_b: string | null;
};

type Pred = {
  match_id: number;
  score_a: number;
  score_b: number;
  qualifier_team_id: number;
};

async function saveKnockoutAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const matchId = Number(formData.get("match_id"));
  const scoreA = Number(formData.get("score_a"));
  const scoreB = Number(formData.get("score_b"));
  const qualifier = Number(formData.get("qualifier_team_id"));

  if (!matchId || Number.isNaN(scoreA) || Number.isNaN(scoreB) || !qualifier) {
    redirect("/predictions/knockout?error=1");
  }
  if (scoreA < 0 || scoreB < 0) {
    redirect("/predictions/knockout?error=1");
  }

  const m = await query<{
    kickoff_at: string;
    team_a_id: number | null;
    team_b_id: number | null;
  }>(
    `select kickoff_at, team_a_id, team_b_id
       from knockout_matches where id = $1`,
    [matchId],
  );
  if (m.length === 0) redirect("/predictions/knockout?error=1");
  const match = m[0];

  if (new Date(match.kickoff_at).getTime() <= Date.now()) {
    redirect(`/predictions/knockout?locked=${matchId}`);
  }
  if (
    match.team_a_id != null &&
    match.team_b_id != null &&
    qualifier !== match.team_a_id &&
    qualifier !== match.team_b_id
  ) {
    redirect("/predictions/knockout?error=1");
  }
  if (scoreA === scoreB) {
    redirect(`/predictions/knockout?error=draw#m${matchId}`);
  }

  await query(
    `insert into knockout_predictions
       (user_id, match_id, score_a, score_b, qualifier_team_id, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (user_id, match_id) do update set
         score_a = excluded.score_a,
         score_b = excluded.score_b,
         qualifier_team_id = excluded.qualifier_team_id,
         updated_at = now()`,
    [user.id, matchId, scoreA, scoreB, qualifier],
  );
  revalidatePath("/predictions/knockout");
  redirect(`/predictions/knockout?saved=${matchId}#m${matchId}`);
}

export default async function KnockoutPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; locked?: string }>;
}) {
  const user = await requireUser();
  const { saved, error, locked } = await searchParams;

  const matches = await query<Match>(
    `select m.id, m.stage, m.label, m.kickoff_at,
            m.team_a_id, m.team_b_id,
            ta.name as name_a, tb.name as name_b,
            ta.flag as flag_a, tb.flag as flag_b
       from knockout_matches m
       left join teams ta on ta.id = m.team_a_id
       left join teams tb on tb.id = m.team_b_id
       order by m.kickoff_at asc`,
  );

  const preds = await query<Pred>(
    `select match_id, score_a, score_b, qualifier_team_id
       from knockout_predictions where user_id = $1`,
    [user.id],
  );
  const predMap = new Map(preds.map((p) => [p.match_id, p]));

  const byStage = new Map<string, Match[]>();
  for (const m of matches) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Pronostics — Phase à élimination</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pour chaque match : score exact (3 pts) + équipe qualifiée (1 pt). Verrouillé au coup d&apos;envoi.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Les équipes apparaîtront ici au fur et à mesure que l&apos;admin met à jour la grille.
        </p>
      </div>

      {saved ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✅ Pronostic enregistré.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error === "draw"
            ? "❌ Le match nul n'est pas autorisé en élimination directe — choisis un score qualifiant."
            : "❌ Vérifie tes saisies."}
        </p>
      ) : null}
      {locked ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          🔒 Ce match a déjà commencé.
        </p>
      ) : null}

      {STAGE_ORDER.map((stage) => {
        const list = byStage.get(stage);
        if (!list) return null;
        return (
          <section key={stage} className="space-y-3">
            <h2 className="text-lg font-bold text-brand-dark">{STAGE_LABEL[stage]}</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {list.map((m) => (
                <KnockoutMatchCard
                  key={m.id}
                  match={m}
                  pred={predMap.get(m.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KnockoutMatchCard({
  match,
  pred,
}: {
  match: Match;
  pred?: Pred;
}) {
  const kickoff = new Date(match.kickoff_at);
  const isLocked = kickoff.getTime() <= Date.now();
  const teamsKnown = match.team_a_id != null && match.team_b_id != null;

  return (
    <form
      id={`m${match.id}`}
      action={saveKnockoutAction}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="match_id" value={match.id} />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium uppercase tracking-wide">{match.label}</span>
        <span>
          {kickoff.toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
          {isLocked ? " · 🔒" : ""}
        </span>
      </div>

      {!teamsKnown ? (
        <p className="mt-3 text-sm italic text-slate-500">
          Équipes pas encore renseignées par l&apos;admin.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="text-right">
              <div className="font-semibold text-slate-800">
                {match.flag_a} {match.name_a}
              </div>
              <input
                type="number"
                name="score_a"
                min={0}
                max={20}
                required
                defaultValue={pred?.score_a ?? ""}
                disabled={isLocked}
                className="mt-1 w-16 rounded-lg border border-slate-300 px-2 py-1 text-right text-lg font-bold tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
              />
            </div>
            <div className="text-slate-400">vs</div>
            <div className="text-left">
              <div className="font-semibold text-slate-800">
                {match.flag_b} {match.name_b}
              </div>
              <input
                type="number"
                name="score_b"
                min={0}
                max={20}
                required
                defaultValue={pred?.score_b ?? ""}
                disabled={isLocked}
                className="mt-1 w-16 rounded-lg border border-slate-300 px-2 py-1 text-left text-lg font-bold tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
              />
            </div>
          </div>

          <label className="mt-3 block text-sm">
            <span className="font-medium text-slate-700">Qualifié·e</span>
            <select
              name="qualifier_team_id"
              defaultValue={pred?.qualifier_team_id ?? ""}
              required
              disabled={isLocked}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
            >
              <option value="" disabled>
                Choisir…
              </option>
              <option value={match.team_a_id!}>
                {match.flag_a} {match.name_a}
              </option>
              <option value={match.team_b_id!}>
                {match.flag_b} {match.name_b}
              </option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isLocked}
            className="mt-3 w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white shadow transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pred ? "Mettre à jour" : "Enregistrer"}
          </button>
        </>
      )}
    </form>
  );
}
