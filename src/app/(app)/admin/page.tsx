import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const GROUPS = "ABCDEFGHIJKL".split("");
const STAGE_LABEL: Record<string, string> = {
  R32: "1/16e de finale",
  R16: "1/8e de finale",
  QF: "Quarts de finale",
  SF: "Demi-finales",
  "3RD": "Match pour la 3e place",
  F: "Finale",
};

type Team = { id: number; name: string; flag: string; group_letter: string | null };

async function saveGroupResultAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const group = String(formData.get("group_letter") ?? "");
  const first = numOrNull(formData.get("first_team_id"));
  const second = numOrNull(formData.get("second_team_id"));

  if (!GROUPS.includes(group)) redirect("/admin?error=1");

  await query(
    `insert into group_results (group_letter, first_team_id, second_team_id)
       values ($1, $2, $3)
       on conflict (group_letter) do update set
         first_team_id  = excluded.first_team_id,
         second_team_id = excluded.second_team_id`,
    [group, first, second],
  );
  revalidatePath("/admin");
  redirect(`/admin?saved=group${group}#group${group}`);
}

async function saveCarreResultAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const ids = [1, 2, 3, 4].map((n) => numOrNull(formData.get(`team${n}_id`)));
  await query(
    `update carre_results set
       team1_id = $1, team2_id = $2, team3_id = $3, team4_id = $4
       where id = 1`,
    ids,
  );
  revalidatePath("/admin");
  redirect("/admin?saved=carre#carre");
}

async function saveKnockoutMatchAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = Number(formData.get("match_id"));
  if (!id) redirect("/admin?error=1");

  const teamA = numOrNull(formData.get("team_a_id"));
  const teamB = numOrNull(formData.get("team_b_id"));
  const scoreA = numOrNull(formData.get("score_a"));
  const scoreB = numOrNull(formData.get("score_b"));
  const qualifier = numOrNull(formData.get("qualifier_team_id"));
  const kickoffStr = String(formData.get("kickoff_at") ?? "").trim();
  const kickoffAt = kickoffStr ? new Date(kickoffStr) : null;

  await query(
    `update knockout_matches set
       team_a_id = $1, team_b_id = $2,
       score_a = $3, score_b = $4,
       qualifier_team_id = $5,
       kickoff_at = coalesce($6, kickoff_at)
       where id = $7`,
    [teamA, teamB, scoreA, scoreB, qualifier, kickoffAt, id],
  );
  revalidatePath("/admin");
  redirect(`/admin?saved=match${id}#match${id}`);
}

function numOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const { saved, error } = await searchParams;

  const teams = await query<Team>(
    `select id, name, flag, group_letter from teams order by group_letter, name`,
  );
  const teamsByGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const g = t.group_letter ?? "";
    const arr = teamsByGroup.get(g) ?? [];
    arr.push(t);
    teamsByGroup.set(g, arr);
  }

  const groupResults = await query<{
    group_letter: string;
    first_team_id: number | null;
    second_team_id: number | null;
  }>(`select group_letter, first_team_id, second_team_id from group_results`);
  const grMap = new Map(groupResults.map((r) => [r.group_letter, r]));

  const carre = await query<{
    team1_id: number | null;
    team2_id: number | null;
    team3_id: number | null;
    team4_id: number | null;
  }>(
    `select team1_id, team2_id, team3_id, team4_id from carre_results where id = 1`,
  );
  const carreCurrent = carre[0];

  const matches = await query<{
    id: number;
    stage: string;
    label: string;
    kickoff_at: string;
    team_a_id: number | null;
    team_b_id: number | null;
    score_a: number | null;
    score_b: number | null;
    qualifier_team_id: number | null;
  }>(
    `select id, stage, label, kickoff_at, team_a_id, team_b_id,
            score_a, score_b, qualifier_team_id
       from knockout_matches order by kickoff_at`,
  );

  const allTeamsSorted = teams;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Saisis les résultats officiels. Le classement se met à jour automatiquement.
        </p>
      </div>

      {saved ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">✅ Enregistré.</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">❌ Erreur — vérifie ta saisie.</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-brand-dark">Phase de poule — résultats officiels</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((g) => {
            const groupTeams = teamsByGroup.get(g) ?? [];
            const r = grMap.get(g);
            return (
              <form
                id={`group${g}`}
                key={g}
                action={saveGroupResultAction}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <input type="hidden" name="group_letter" value={g} />
                <h3 className="font-bold text-brand-dark">Poule {g}</h3>
                <TeamSelect
                  label="🥇 1er officiel"
                  name="first_team_id"
                  teams={groupTeams}
                  defaultValue={r?.first_team_id ?? undefined}
                  allowEmpty
                />
                <TeamSelect
                  label="🥈 2e officiel"
                  name="second_team_id"
                  teams={groupTeams}
                  defaultValue={r?.second_team_id ?? undefined}
                  allowEmpty
                />
                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-brand-dark"
                >
                  Enregistrer
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section id="carre" className="space-y-3">
        <h2 className="text-xl font-bold text-brand-dark">Carré d&apos;As — vrais demi-finalistes</h2>
        <form
          action={saveCarreResultAction}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <TeamSelect
                key={n}
                label={`Demi-finaliste #${n}`}
                name={`team${n}_id`}
                teams={allTeamsSorted}
                defaultValue={
                  carreCurrent
                    ? (carreCurrent[`team${n}_id` as keyof typeof carreCurrent] as
                        | number
                        | null) ?? undefined
                    : undefined
                }
                allowEmpty
                showGroup
              />
            ))}
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand px-4 py-2 font-semibold text-white shadow transition hover:bg-brand-dark"
          >
            Enregistrer le Carré d&apos;As officiel
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-brand-dark">Phase à élimination — calendrier &amp; résultats</h2>
        <p className="text-sm text-slate-600">
          Renseigne les équipes au fur et à mesure que la grille se précise, puis saisis le score final et l&apos;équipe qualifiée.
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {matches.map((m) => (
            <form
              id={`match${m.id}`}
              key={m.id}
              action={saveKnockoutMatchAction}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <input type="hidden" name="match_id" value={m.id} />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wide text-brand-dark">
                  {STAGE_LABEL[m.stage]} — {m.label}
                </span>
              </div>

              <label className="mt-3 block text-sm">
                <span className="font-medium text-slate-700">Coup d&apos;envoi</span>
                <input
                  type="datetime-local"
                  name="kickoff_at"
                  defaultValue={toLocalInput(m.kickoff_at)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <TeamSelect
                  label="Équipe A"
                  name="team_a_id"
                  teams={allTeamsSorted}
                  defaultValue={m.team_a_id ?? undefined}
                  allowEmpty
                  showGroup
                />
                <TeamSelect
                  label="Équipe B"
                  name="team_b_id"
                  teams={allTeamsSorted}
                  defaultValue={m.team_b_id ?? undefined}
                  allowEmpty
                  showGroup
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberField
                  label="Score A"
                  name="score_a"
                  defaultValue={m.score_a ?? undefined}
                />
                <NumberField
                  label="Score B"
                  name="score_b"
                  defaultValue={m.score_b ?? undefined}
                />
              </div>

              <TeamSelect
                label="Qualifié·e"
                name="qualifier_team_id"
                teams={allTeamsSorted}
                defaultValue={m.qualifier_team_id ?? undefined}
                allowEmpty
                showGroup
              />

              <button
                type="submit"
                className="mt-3 w-full rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-brand-dark"
              >
                Enregistrer
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <Link href="/leaderboard" className="font-semibold text-brand hover:underline">
          → Voir le classement
        </Link>
      </section>
    </div>
  );
}

function TeamSelect({
  label,
  name,
  teams,
  defaultValue,
  allowEmpty,
  showGroup,
}: {
  label: string;
  name: string;
  teams: Team[];
  defaultValue?: number;
  allowEmpty?: boolean;
  showGroup?: boolean;
}) {
  return (
    <label className="mt-2 block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        <option value="">{allowEmpty ? "— non renseigné —" : "Choisir…"}</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.flag} {t.name}
            {showGroup && t.group_letter ? ` (Gr. ${t.group_letter})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        max={20}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
