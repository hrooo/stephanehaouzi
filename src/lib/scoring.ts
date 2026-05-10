import { query } from "@/lib/db";

export type Scoreboard = {
  user_id: string;
  display_name: string;
  group_points: number;
  knockout_points: number;
  carre_points: number;
  total: number;
};

/**
 * Calcule les points pour un pronostic de poule donné le résultat officiel.
 *  - 3 pts : top 2 dans l'ordre exact
 *  - 2 pts : top 2 corrects mais inversés
 *  - 1 pt  : une seule équipe correcte (peu importe la position)
 *  - 0 pt  : sinon
 */
export function scoreGroupPrediction(
  pred: { first: number; second: number },
  result: { first: number | null; second: number | null },
): number {
  if (result.first == null || result.second == null) return 0;
  if (pred.first === result.first && pred.second === result.second) return 3;
  if (pred.first === result.second && pred.second === result.first) return 2;
  const predSet = new Set([pred.first, pred.second]);
  const hits = [result.first, result.second].filter((t) => predSet.has(t)).length;
  return hits >= 1 ? 1 : 0;
}

/**
 * Calcule les points pour un pronostic à élimination directe.
 *  - 3 pts : score exact
 *  - 1 pt  : équipe qualifiée correcte (cumulable avec le score)
 */
export function scoreKnockoutPrediction(
  pred: { score_a: number; score_b: number; qualifier_team_id: number },
  result: {
    score_a: number | null;
    score_b: number | null;
    qualifier_team_id: number | null;
  },
): number {
  let pts = 0;
  if (
    result.score_a != null &&
    result.score_b != null &&
    result.score_a === pred.score_a &&
    result.score_b === pred.score_b
  ) {
    pts += 3;
  }
  if (
    result.qualifier_team_id != null &&
    result.qualifier_team_id === pred.qualifier_team_id
  ) {
    pts += 1;
  }
  return pts;
}

/**
 * Bonus "Carré d'As" : compare 4 équipes pronostiquées aux 4 vrais demi-finalistes.
 *  4 bonnes → 10 pts | 3 → 7 | 2 → 4 | 1 → 1 | 0 → 0
 */
export function scoreCarrePrediction(
  pred: number[],
  actual: (number | null)[],
): number {
  const real = new Set(actual.filter((x): x is number => x != null));
  if (real.size === 0) return 0;
  const hits = pred.filter((id) => real.has(id)).length;
  return [0, 1, 4, 7, 10][hits] ?? 0;
}

/** Calcule et renvoie le classement complet de la famille. */
export async function computeLeaderboard(): Promise<Scoreboard[]> {
  const profiles = await query<{ id: string; display_name: string }>(
    `select id::text, display_name from profiles order by display_name asc`,
  );

  const groupPreds = await query<{
    user_id: string;
    group_letter: string;
    first_team_id: number;
    second_team_id: number;
  }>(
    `select user_id::text, group_letter, first_team_id, second_team_id
       from group_predictions`,
  );
  const groupResults = await query<{
    group_letter: string;
    first_team_id: number | null;
    second_team_id: number | null;
  }>(`select group_letter, first_team_id, second_team_id from group_results`);
  const grMap = new Map(groupResults.map((r) => [r.group_letter, r]));

  const knockoutPreds = await query<{
    user_id: string;
    match_id: number;
    score_a: number;
    score_b: number;
    qualifier_team_id: number;
  }>(
    `select user_id::text, match_id, score_a, score_b, qualifier_team_id
       from knockout_predictions`,
  );
  const knockoutResults = await query<{
    id: number;
    score_a: number | null;
    score_b: number | null;
    qualifier_team_id: number | null;
  }>(
    `select id, score_a, score_b, qualifier_team_id from knockout_matches`,
  );
  const knMap = new Map(knockoutResults.map((m) => [m.id, m]));

  const carrePreds = await query<{
    user_id: string;
    team1_id: number;
    team2_id: number;
    team3_id: number;
    team4_id: number;
  }>(
    `select user_id::text, team1_id, team2_id, team3_id, team4_id
       from carre_predictions`,
  );
  const carreActual = await query<{
    team1_id: number | null;
    team2_id: number | null;
    team3_id: number | null;
    team4_id: number | null;
  }>(
    `select team1_id, team2_id, team3_id, team4_id from carre_results where id = 1`,
  );
  const actualSet =
    carreActual[0] != null
      ? [
          carreActual[0].team1_id,
          carreActual[0].team2_id,
          carreActual[0].team3_id,
          carreActual[0].team4_id,
        ]
      : [];

  return profiles
    .map((p) => {
      const groupPts = groupPreds
        .filter((gp) => gp.user_id === p.id)
        .reduce((sum, gp) => {
          const r = grMap.get(gp.group_letter);
          if (!r) return sum;
          return (
            sum +
            scoreGroupPrediction(
              { first: gp.first_team_id, second: gp.second_team_id },
              { first: r.first_team_id, second: r.second_team_id },
            )
          );
        }, 0);

      const knockoutPts = knockoutPreds
        .filter((kp) => kp.user_id === p.id)
        .reduce((sum, kp) => {
          const m = knMap.get(kp.match_id);
          if (!m) return sum;
          return (
            sum +
            scoreKnockoutPrediction(
              {
                score_a: kp.score_a,
                score_b: kp.score_b,
                qualifier_team_id: kp.qualifier_team_id,
              },
              {
                score_a: m.score_a,
                score_b: m.score_b,
                qualifier_team_id: m.qualifier_team_id,
              },
            )
          );
        }, 0);

      const carre = carrePreds.find((c) => c.user_id === p.id);
      const carrePts = carre
        ? scoreCarrePrediction(
            [carre.team1_id, carre.team2_id, carre.team3_id, carre.team4_id],
            actualSet,
          )
        : 0;

      return {
        user_id: p.id,
        display_name: p.display_name,
        group_points: groupPts,
        knockout_points: knockoutPts,
        carre_points: carrePts,
        total: groupPts + knockoutPts + carrePts,
      } satisfies Scoreboard;
    })
    .sort((a, b) => b.total - a.total || a.display_name.localeCompare(b.display_name));
}

export async function getGroupLockAt(): Promise<Date> {
  const rows = await query<{ value: string }>(
    `select value from settings where key = 'group_lock_at'`,
  );
  return new Date(rows[0]?.value ?? "2026-06-11T17:00:00Z");
}

export async function isGroupStageLocked(): Promise<boolean> {
  const lockAt = await getGroupLockAt();
  return Date.now() >= lockAt.getTime();
}
