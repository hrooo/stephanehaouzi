import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getGroupLockAt, isGroupStageLocked } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Team = { id: number; name: string; flag: string; group_letter: string | null };

async function saveCarreAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (await isGroupStageLocked()) redirect("/predictions/carre?locked=1");

  const ids = [1, 2, 3, 4].map((n) => Number(formData.get(`team${n}_id`)));
  if (ids.some((x) => !x) || new Set(ids).size !== 4) {
    redirect("/predictions/carre?error=1");
  }

  await query(
    `insert into carre_predictions (user_id, team1_id, team2_id, team3_id, team4_id, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (user_id) do update set
         team1_id = excluded.team1_id,
         team2_id = excluded.team2_id,
         team3_id = excluded.team3_id,
         team4_id = excluded.team4_id,
         updated_at = now()`,
    [user.id, ...ids],
  );
  revalidatePath("/predictions/carre");
  redirect("/predictions/carre?saved=1");
}

export default async function CarrePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; locked?: string }>;
}) {
  const user = await requireUser();
  const { saved, error, locked: lockedParam } = await searchParams;
  const locked = await isGroupStageLocked();
  const lockAt = await getGroupLockAt();

  const teams = await query<Team>(
    `select id, name, flag, group_letter from teams order by group_letter, name`,
  );

  const pred = await queryOne<{
    team1_id: number;
    team2_id: number;
    team3_id: number;
    team4_id: number;
  }>(
    `select team1_id, team2_id, team3_id, team4_id
       from carre_predictions where user_id = $1`,
    [user.id],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">
          Bonus — Carré d&apos;As 🃏
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Pronostique les <strong>4 demi-finalistes</strong> avant le coup d&apos;envoi du tournoi (
          {lockAt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
          ).
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Barème : <strong>10 pts</strong> pour 4 bonnes · <strong>7 pts</strong> pour 3 ·{" "}
          <strong>4 pts</strong> pour 2 · <strong>1 pt</strong> pour 1.
        </p>
      </div>

      {saved ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✅ Carré d&apos;As enregistré.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          ❌ Choisis 4 équipes différentes.
        </p>
      ) : null}
      {lockedParam ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          🔒 Verrouillé — la compétition a commencé.
        </p>
      ) : null}

      <form
        action={saveCarreAction}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <TeamSelect
              key={n}
              label={`Demi-finaliste #${n}`}
              name={`team${n}_id`}
              teams={teams}
              defaultValue={
                pred ? (pred[`team${n}_id` as keyof typeof pred] as number) : undefined
              }
              disabled={locked}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={locked}
          className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          {pred ? "Mettre à jour mon Carré d'As" : "Enregistrer mon Carré d'As"}
        </button>
      </form>
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
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
      >
        <option value="" disabled>
          Choisir une équipe…
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.flag} {t.name}
            {t.group_letter ? ` (Groupe ${t.group_letter})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
