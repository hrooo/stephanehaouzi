import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 text-6xl">🏆</div>
      <h1 className="text-4xl font-bold text-brand-dark sm:text-5xl">
        Coupe du Monde 2026 — Famille
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-700">
        Pronostique les qualifiés de chaque poule, devine les scores des
        matchs à élimination directe et grimpe au classement familial.
      </p>

      <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/signup"
          className="rounded-xl bg-brand px-6 py-4 text-lg font-semibold text-white shadow transition hover:bg-brand-dark"
        >
          Créer mon compte
        </Link>
        <Link
          href="/login"
          className="rounded-xl border-2 border-brand px-6 py-4 text-lg font-semibold text-brand transition hover:bg-brand/10"
        >
          Se connecter
        </Link>
      </div>

      <section className="mt-12 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-brand-dark">Phases de poule</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>🥇 3 pts — top 2 dans l&apos;ordre</li>
            <li>🥈 2 pts — top 2 dans le désordre</li>
            <li>🥉 1 pt — 1 seule équipe trouvée</li>
            <li>0 pt — aucune</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-brand-dark">Phases finales</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>🎯 3 pts — bon score exact</li>
            <li>✅ 1 pt — équipe qualifiée</li>
            <li>… jusqu&apos;à la finale</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
