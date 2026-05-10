import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import {
  STYLE_KEYS,
  STYLE_LABELS,
  type AvatarStyle,
  isAvatarStyle,
} from "@/lib/avatar";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

async function saveProfileAction(formData: FormData) {
  "use server";
  const user = await requireUser();

  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatarStyle = String(formData.get("avatar_style") ?? "fun-emoji");
  const avatarSeed = String(formData.get("avatar_seed") ?? "").trim();

  if (displayName.length < 2) {
    redirect("/profile?error=name");
  }
  if (!isAvatarStyle(avatarStyle)) {
    redirect("/profile?error=style");
  }

  await query(
    `update profiles
        set display_name = $1,
            avatar_style = $2,
            avatar_seed  = $3
      where id = $4`,
    [displayName, avatarStyle, avatarSeed || displayName, user.id],
  );
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { saved, error } = await searchParams;

  const profile = await queryOne<{
    display_name: string;
    avatar_style: string;
    avatar_seed: string | null;
  }>(
    `select display_name, avatar_style, avatar_seed
       from profiles where id = $1`,
    [user.id],
  );

  const currentStyle = (profile?.avatar_style ?? "fun-emoji") as AvatarStyle;
  const currentSeed = profile?.avatar_seed ?? user.display_name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Mon profil</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choisis ton avatar et ton pseudo affichés au classement.
        </p>
      </div>

      {saved ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✅ Profil mis à jour.
        </p>
      ) : null}
      {error === "name" ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          ❌ Pseudo trop court (2 caractères min).
        </p>
      ) : null}

      <form
        action={saveProfileAction}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <Avatar style={currentStyle} seed={currentSeed} size="xl" />
          <div className="text-sm text-slate-600">
            <p>
              Ton avatar actuel. Il est généré à partir de ton{" "}
              <strong>pseudo de seed</strong> et du <strong>style</strong> choisi.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Astuce : change le pseudo de seed pour piocher un autre dessin du même style.
            </p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Pseudo affiché</span>
          <input
            type="text"
            name="display_name"
            defaultValue={profile?.display_name ?? user.display_name}
            required
            minLength={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Pseudo de seed (génère le dessin)</span>
          <input
            type="text"
            name="avatar_seed"
            defaultValue={currentSeed}
            placeholder="ex: ton prénom, surnom…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Style d&apos;avatar</legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STYLE_KEYS.map((styleKey) => (
              <label
                key={styleKey}
                className="cursor-pointer rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-center transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:checked]:ring-2 has-[:checked]:ring-brand/20"
              >
                <input
                  type="radio"
                  name="avatar_style"
                  value={styleKey}
                  defaultChecked={styleKey === currentStyle}
                  className="sr-only"
                />
                <Avatar style={styleKey} seed={currentSeed} size="lg" className="mx-auto" />
                <div className="mt-2 text-xs font-medium text-slate-700">
                  {STYLE_LABELS[styleKey]}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow transition hover:bg-brand-dark sm:w-auto"
        >
          Enregistrer mon profil
        </button>
      </form>
    </div>
  );
}
