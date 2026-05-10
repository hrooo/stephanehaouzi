import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupLockAt } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function AidePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const lockAt = await getGroupLockAt();
  const isWelcome = welcome === "1";

  return (
    <div className="space-y-8 pb-12">
      {isWelcome ? (
        <section className="rounded-2xl border-2 border-brand bg-brand/5 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-brand-dark">
            Bienvenue {user.display_name} ! 🎉
          </h1>
          <p className="mt-2 text-slate-700">
            Tu viens de créer ton compte. Ce mini-guide te dit{" "}
            <strong>tout ce qu&apos;il faut savoir en 2 minutes</strong> pour bien
            paramétrer tes pronos avant le coup d&apos;envoi de la Coupe du Monde.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-white shadow transition hover:bg-brand-dark"
          >
            J&apos;ai compris, accéder à mon tableau de bord →
          </Link>
        </section>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Comment ça marche ?</h1>
          <p className="mt-1 text-sm text-slate-600">
            Le guide complet du concours familial.
          </p>
        </div>
      )}

      <Section title="🏆 Le concept en 30 secondes" intro="">
        <p>
          Avant la Coupe du Monde 2026, chacun fait <strong>3 types de pronostics</strong> :
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-6">
          <li>
            les <strong>2 premiers de chaque poule</strong> (12 poules, 12 pronos),
          </li>
          <li>
            les <strong>4 demi-finalistes</strong> (bonus Carré d&apos;As),
          </li>
          <li>
            le <strong>score exact</strong> et le <strong>qualifié</strong> de chaque match à
            élimination directe (32 matchs au total).
          </li>
        </ol>
        <p className="mt-3">
          Plus tu trouves juste, plus tu marques de points. Le classement est
          mis à jour automatiquement à chaque résultat.
        </p>
      </Section>

      <Section title="📅 Les étapes à suivre" intro="">
        <Step
          n={1}
          title="Personnalise ton profil"
          done={false}
          cta={{ href: "/profile", label: "Aller au profil" }}
        >
          Choisis ton avatar (8 styles dispos) et ton pseudo affiché au
          classement.
        </Step>
        <Step
          n={2}
          title="Fais tes pronos de phase de poule"
          done={false}
          cta={{ href: "/predictions/groups", label: "Pronostiquer les poules" }}
          deadline={lockAt}
        >
          Pour chaque poule (A à L), choisis ton 1<sup>er</sup> et ton 2
          <sup>e</sup>. Tu peux modifier autant de fois que tu veux jusqu&apos;au
          coup d&apos;envoi du tournoi.
        </Step>
        <Step
          n={3}
          title="Choisis tes 4 demi-finalistes"
          done={false}
          cta={{ href: "/predictions/carre", label: "Faire mon Carré d'As" }}
          deadline={lockAt}
        >
          C&apos;est le bonus à fort potentiel : <strong>jusqu&apos;à 10 points</strong> en
          un seul prono. Verrouillé en même temps que les pronos de poule.
        </Step>
        <Step
          n={4}
          title="Pronostique chaque match à élimination directe"
          done={false}
          cta={{ href: "/predictions/knockout", label: "Voir les matchs élim." }}
        >
          Les matchs apparaissent au fur et à mesure que la grille se précise.
          Pour chaque match : score exact + équipe qui passe. Verrouillé au
          coup d&apos;envoi de chaque match.
        </Step>
        <Step
          n={5}
          title="Suis le classement en direct"
          done={false}
          cta={{ href: "/leaderboard", label: "Voir le classement" }}
        >
          Onglets pour voir le classement à chaque étape : fin des poules,
          après les 1/16, 1/8, quarts, demis, finale.
        </Step>
      </Section>

      <Section title="💯 Le barème de points" intro="">
        <Table
          headers={["Catégorie", "Pronostic", "Points"]}
          rows={[
            ["Phase de poule", "🥇 Top 2 dans le bon ordre", "3 pts"],
            ["Phase de poule", "🥈 Top 2 corrects mais inversés", "2 pts"],
            ["Phase de poule", "🥉 1 seule équipe correcte", "1 pt"],
            ["Phase de poule", "Aucune trouvée", "0 pt"],
            ["Élim. directe", "🎯 Score exact", "3 pts"],
            ["Élim. directe", "✅ Bonne équipe qualifiée", "1 pt (cumulable)"],
            ["Élim. directe", "Score exact + bon qualifié", "4 pts max / match"],
            ["Carré d'As", "4 demi-finalistes corrects", "10 pts"],
            ["Carré d'As", "3 corrects", "7 pts"],
            ["Carré d'As", "2 corrects", "4 pts"],
            ["Carré d'As", "1 correct", "1 pt"],
          ]}
        />
        <p className="mt-3 text-sm text-slate-600">
          💡 <strong>Astuce</strong> : ne néglige pas le Carré d&apos;As — 10 pts c&apos;est
          l&apos;équivalent de 3 scores exacts en élim&nbsp;!
        </p>
      </Section>

      <Section title="🔒 Quand les pronos se verrouillent" intro="">
        <ul className="space-y-2">
          <li>
            🟢 <strong>Pronos de poule</strong> et <strong>Carré d&apos;As</strong> : verrouillés{" "}
            <strong>au coup d&apos;envoi du tournoi</strong> (
            {lockAt.toLocaleString("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
            ). Tu peux modifier autant de fois que tu veux avant.
          </li>
          <li>
            🟢 <strong>Chaque match à élimination</strong> : verrouillé{" "}
            <strong>au coup d&apos;envoi du match concerné</strong>. Tu peux donc
            ajuster en temps réel selon ce qui s&apos;est passé avant.
          </li>
        </ul>
      </Section>

      <Section title="📊 Comprendre le classement" intro="">
        <p>
          Le classement se met à jour automatiquement à chaque résultat saisi.
          Sur la page <Link href="/leaderboard" className="text-brand hover:underline">Classement</Link>,
          tu peux passer en mode <strong>snapshot</strong> pour voir où chacun
          en était :
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>à la fin des phases de poule,</li>
          <li>après chaque tour à élimination (1/16, 1/8, quarts, demis…),</li>
          <li>jusqu&apos;à la finale.</li>
        </ul>
        <p className="mt-2">
          Le bonus Carré d&apos;As n&apos;entre dans le calcul qu&apos;à partir des
          demi-finales (logique : on ne peut juger les demi-finalistes qu&apos;une
          fois qu&apos;ils sont connus).
        </p>
      </Section>

      <Section title="❓ FAQ" intro="">
        <Faq q="Je peux modifier mes pronos après les avoir enregistrés ?">
          Oui, tant que la deadline n&apos;est pas passée. Pour les pronos de poule
          et le Carré d&apos;As, c&apos;est jusqu&apos;au coup d&apos;envoi du tournoi. Pour les
          matchs élim, c&apos;est jusqu&apos;au coup d&apos;envoi du match.
        </Faq>
        <Faq q="Que se passe-t-il si je rate la deadline d'un match élim ?">
          Tu n&apos;as juste pas de pronostic enregistré pour ce match-là, donc 0
          point. Tu peux toujours pronostiquer les matchs suivants.
        </Faq>
        <Faq q="Comment les résultats sont-ils saisis ?">
          L&apos;app récupère les résultats automatiquement depuis football-data.org
          (toutes les 15 minutes). En complément, l&apos;admin peut saisir ou
          corriger les résultats manuellement.
        </Faq>
        <Faq q="Un match nul est-il possible en élim. directe ?">
          Non — il y a forcément un qualifié (prolongations puis tirs au but).
          C&apos;est pour ça que l&apos;app refuse les pronos de score à égalité sur les
          matchs élim.
        </Faq>
        <Faq q="Je suis le 1er compte créé : à quoi ai-je accès en plus ?">
          Tu es admin. Tu as accès à <Link href="/admin" className="text-brand hover:underline">/admin</Link>{" "}
          pour saisir/corriger les résultats officiels et déclencher la
          synchronisation manuellement.
        </Faq>
      </Section>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        Une question, un bug, une suggestion ? Parle-en directement à l&apos;admin
        de la famille (le 1<sup>er</sup> compte créé).
      </div>
    </div>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-brand-dark">{title}</h2>
      {intro ? <p className="mt-1 text-sm text-slate-600">{intro}</p> : null}
      <div className="mt-3 space-y-2 text-slate-700">{children}</div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
  cta,
  deadline,
}: {
  n: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
  cta?: { href: string; label: string };
  deadline?: Date;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{children}</p>
        {deadline ? (
          <p className="mt-1 text-xs text-amber-700">
            ⏳ Verrouillé le{" "}
            {deadline.toLocaleString("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        ) : null}
        {cta ? (
          <Link
            href={cta.href}
            className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
          >
            {cta.label} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-100 bg-slate-50 p-3 open:bg-white">
      <summary className="cursor-pointer list-none font-semibold text-slate-800">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        {q}
      </summary>
      <div className="mt-2 pl-5 text-sm text-slate-600">{children}</div>
    </details>
  );
}
