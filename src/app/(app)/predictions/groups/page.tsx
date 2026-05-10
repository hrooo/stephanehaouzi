import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { isGroupStageLocked } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const GROUPS = "ABCDEFGHIJKL".split("");

type Team = {
  id: number;
  name: string;
  code: string;
  flag: string;
  group_letter: string;
};

type Pred = {
  group_letter: string;
  first_team_id: number;
  second_team_id: number;
};

async function saveGroupAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (await isGroupStageLocked()) redirect("/predictions/groups?locked=1");

  const group = String(formData.get("group_letter") ?? "");
  const first = Number(formData.get("first_team_id"));
  const second = Number(formData.get("second_team_id"));

  if (!GROUPS.includes(group) || !first || !second || first === second) {
    redirect("/predictions/groups?error=1");
  }

  await query(
    `insert into group_predictions (user_id, group_letter, first_team_id, second_team_id, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (user_id, group_letter)
         do update set first_team_id = excluded.first_team_id,
                       second_team_id = excluded.second_team_id,
                       updated_at = now()`,
    [user.id, group, first, second],
  );
  revalidatePath("/predictions/groups");
  redirect(`/predictions/groups?saved=${group}`);
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; locked?: string }>;
}) {
  const user = await requireUser();
  const { saved, error, locked: lockedParam } = await searchParams;
  const locked = await isGroupStageLocked();

  const teams = await query<Team>(
    `select id, name, code, flag, group_letter
       from teams
       where group_letter is not null
       order by group_letter, name`,
  );
  const teamsByGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const arr = teamsByGroup.get(t.group_letter) ?? [];
    arr.push(t);
    teamsByGroup.set(t.group_letter, arr);
  }

  const preds = await query<Pred>(
    `select group_letter, first_team_id, second_team_id
       from group_predictions
       where user_id = $1`,
    [user.id],
  );
  const predByGroup = new Map(preds.map((p) => [p.group_letter, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Pronostics — Phase de poule</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choisis le 1<sup>er</sup> et le 2<sup>e</sup> de chaque poule.
          {locked ? " Verrouillé." : " Tu peux modifier tant que la compétition n'a pas commencé."}
        </p>
      </div>

      {saved ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✅ Pronostic du groupe {saved} enregistré.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          ❌ Le 1<sup>er</sup> et le 2<sup>e</sup> doivent être deux équipes différentes.
        </p>
      ) : null}
      {lockedParam ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          🔒 Trop tard, la compétition a commencé.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((g) => {
          const groupTeams = teamsByGroup.get(g) ?? [];
          const pred = predByGroup.get(g);
          return (
            <form
              key={g}
              action={saveGroupAction}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <input type="hidden" name="group_letter" value={g} />
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-brand-dark">Poule {g}</h2>
                {pred ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Pronostic enregistré
                  </span>
                ) : null}
              </div>

              <ul className="mb-4 space-y-1 text-sm text-slate-600">
                {groupTeams.map((t) => (
                  <li key={t.id}>
                    {t.flag} {t.name}
                  </li>
                ))}
              </ul>

              <TeamSelect
                label="🥇 1er"
                name="first_team_id"
                teams={groupTeams}
                defaultValue={pred?.first_team_id}
                disabled={locked}
              />
              <TeamSelect
                label="🥈 2e"
                name="second_team_id"
                teams={groupTeams}
                defaultValue={pred?.second_team_id}
                disabled={locked}
              />

              <button
                type="submit"
                disabled={locked}
                className="mt-4 w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white shadow transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pred ? "Mettre à jour" : "Enregistrer"}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function TeamSelect({
  label,
  name,
  teams,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  teams: Team[];
  defaultValue?: number;
  disabled?: boolean;
}) {
  return (
    <label className="mt-2 block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
      >
        <option value="" disabled>
          Choisir…
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.flag} {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
