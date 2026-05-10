import { requireUser } from "@/lib/auth";
import { computeLeaderboard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await requireUser();
  const board = await computeLeaderboard();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-dark">Classement famille</h1>

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
                    {row.display_name} {isMe ? "(toi)" : ""}
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
            <strong>Phase à élimination</strong> : 3 pts si bon score · 1 pt si bonne équipe qualifiée
          </li>
          <li>
            <strong>Carré d&apos;As</strong> (avant tournoi) : 10 / 7 / 4 / 1 / 0 pts pour 4 / 3 / 2 / 1 / 0 demi-finalistes corrects
          </li>
        </ul>
      </section>
    </div>
  );
}
