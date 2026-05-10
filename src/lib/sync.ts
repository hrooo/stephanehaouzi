import { query, queryOne } from "@/lib/db";
import {
  fetchCompetitionMatches,
  fetchCompetitionStandings,
  isFinishedStatus,
  mapStageToInternal,
  type FdMatch,
} from "@/lib/football-data";

export type SyncReport = {
  ok: true;
  competition: string;
  season: string;
  fetched_matches: number;
  teams_linked: number;
  groups_updated: number;
  knockout_matches_updated: number;
  knockout_matches_completed: number;
  ran_at: string;
};

const NAME_ALIASES: Record<string, string[]> = {
  USA: ["USA", "ÉTATS-UNIS", "ETATS-UNIS", "UNITED STATES"],
  ENG: ["ANGLETERRE", "ENGLAND"],
  WAL: ["PAYS DE GALLES", "WALES"],
  KSA: ["ARABIE SAOUDITE", "SAUDI ARABIA"],
  KOR: ["COREE DU SUD", "CORÉE DU SUD", "SOUTH KOREA", "KOREA REPUBLIC"],
  TUR: ["TÜRKIYE", "TURKIYE", "TURQUIE", "TURKEY"],
  CIV: ["CÔTE D'IVOIRE", "COTE D'IVOIRE", "IVORY COAST"],
  COD: ["RD CONGO", "DR CONGO", "CONGO DR", "DEMOCRATIC REPUBLIC OF CONGO"],
  ALG: ["ALGÉRIE", "ALGERIE", "ALGERIA"],
  EGY: ["ÉGYPTE", "EGYPTE", "EGYPT"],
  MAR: ["MAROC", "MOROCCO"],
  ECU: ["ÉQUATEUR", "EQUATEUR", "ECUADOR"],
  GER: ["ALLEMAGNE", "GERMANY"],
  ITA: ["ITALIE", "ITALY"],
  ESP: ["ESPAGNE", "SPAIN"],
  POR: ["PORTUGAL"],
  FRA: ["FRANCE"],
  NED: ["PAYS-BAS", "NETHERLANDS", "HOLLAND"],
  BEL: ["BELGIQUE", "BELGIUM"],
  ARG: ["ARGENTINE", "ARGENTINA"],
  BRA: ["BRÉSIL", "BRESIL", "BRAZIL"],
  URU: ["URUGUAY"],
  COL: ["COLOMBIE", "COLOMBIA"],
  PAR: ["PARAGUAY"],
  POL: ["POLOGNE", "POLAND"],
  CRO: ["CROATIE", "CROATIA"],
  SUI: ["SUISSE", "SWITZERLAND"],
  DEN: ["DANEMARK", "DENMARK"],
  AUT: ["AUTRICHE", "AUSTRIA"],
  NOR: ["NORVÈGE", "NORVEGE", "NORWAY"],
  SEN: ["SÉNÉGAL", "SENEGAL"],
  TUN: ["TUNISIE", "TUNISIA"],
  CMR: ["CAMEROUN", "CAMEROON"],
  GHA: ["GHANA"],
  NGA: ["NIGERIA"],
  JPN: ["JAPON", "JAPAN"],
  AUS: ["AUSTRALIE", "AUSTRALIA"],
  IRN: ["IRAN", "IR IRAN"],
  IRQ: ["IRAK", "IRAQ"],
  UZB: ["OUZBÉKISTAN", "OUZBEKISTAN", "UZBEKISTAN"],
  QAT: ["QATAR"],
  HON: ["HONDURAS"],
  PAN: ["PANAMA"],
  CRC: ["COSTA RICA"],
  CAN: ["CANADA"],
  MEX: ["MEXIQUE", "MEXICO"],
  NZL: ["NOUVELLE-ZÉLANDE", "NOUVELLE-ZELANDE", "NEW ZEALAND"],
  BOL: ["BOLIVIE", "BOLIVIA"],
};

function norm(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lie les `teams.external_id` aux IDs football-data en se basant sur le nom/code. */
async function linkTeams(matches: FdMatch[]): Promise<number> {
  type Row = {
    id: number;
    name: string;
    code: string;
    external_id: number | null;
  };
  const rows = await query<Row>(
    `select id, name, code, external_id from teams`,
  );

  const candidates = new Map<string, { id: number; name: string }>();
  for (const m of matches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (!candidates.has(String(t.id))) {
        candidates.set(String(t.id), { id: t.id, name: t.name });
      }
    }
  }

  let linked = 0;
  for (const team of rows) {
    if (team.external_id != null) continue;

    const accepted = new Set([
      norm(team.name),
      norm(team.code),
      ...(NAME_ALIASES[team.code]?.map(norm) ?? []),
    ]);

    let match: { id: number; name: string } | undefined;
    for (const c of candidates.values()) {
      const n = norm(c.name);
      if (accepted.has(n)) {
        match = c;
        break;
      }
      // Match plus lâche : un des alias est inclus dans le nom (ou inversement)
      for (const alias of accepted) {
        if (n.includes(alias) || alias.includes(n)) {
          match = c;
          break;
        }
      }
      if (match) break;
    }

    if (match) {
      await query(`update teams set external_id = $1 where id = $2`, [
        match.id,
        team.id,
      ]);
      linked++;
    }
  }
  return linked;
}

/**
 * Met à jour les résultats officiels de la phase de poule à partir des standings
 * football-data. Le mapping entre le `group` distant ("Group A", "GROUP_A"…) et
 * notre lettre interne (A..L) se fait sur la dernière lettre.
 */
async function syncGroupResults(competitionCode: string, season: string): Promise<number> {
  const standings = await fetchCompetitionStandings(competitionCode, season);
  const teamMap = await query<{ external_id: number; id: number }>(
    `select external_id, id from teams where external_id is not null`,
  );
  const ext2int = new Map(teamMap.map((t) => [t.external_id, t.id]));

  let updated = 0;
  for (const s of standings) {
    if (!s.group) continue;
    const m = s.group.match(/[A-L]\b/i);
    if (!m) continue;
    const letter = m[0].toUpperCase();
    if (s.type && s.type !== "TOTAL") continue;
    const sorted = [...s.table].sort((a, b) => a.position - b.position);
    const first = sorted[0];
    const second = sorted[1];
    if (!first || !second) continue;
    const firstId = ext2int.get(first.team.id) ?? null;
    const secondId = ext2int.get(second.team.id) ?? null;
    if (!firstId || !secondId) continue;

    await query(
      `insert into group_results (group_letter, first_team_id, second_team_id)
         values ($1, $2, $3)
         on conflict (group_letter) do update set
           first_team_id  = excluded.first_team_id,
           second_team_id = excluded.second_team_id`,
      [letter, firstId, secondId],
    );
    updated++;
  }
  return updated;
}

/**
 * Met à jour les matchs à élimination directe à partir de la liste fournie.
 * Stratégie de matching :
 *   1) Si knockout_matches.external_id pointe déjà sur un FdMatch.id → simple update
 *   2) Sinon, on cherche un knockout_match du même stage interne, dont les deux
 *      équipes (ou aucune équipe encore renseignée) correspondent, le plus
 *      proche en date — on lie alors les external_id.
 */
async function syncKnockoutResults(
  matches: FdMatch[],
): Promise<{ updated: number; completed: number }> {
  const teamMap = await query<{ external_id: number; id: number }>(
    `select external_id, id from teams where external_id is not null`,
  );
  const ext2int = new Map(teamMap.map((t) => [t.external_id, t.id]));

  type KMatch = {
    id: number;
    stage: string;
    kickoff_at: string;
    team_a_id: number | null;
    team_b_id: number | null;
    external_id: number | null;
  };
  const ours = await query<KMatch>(
    `select id, stage, kickoff_at, team_a_id, team_b_id, external_id
       from knockout_matches
       where stage in ('R32','R16','QF','SF','3RD','F')
       order by kickoff_at`,
  );
  const byExt = new Map(
    ours.filter((m) => m.external_id != null).map((m) => [m.external_id!, m]),
  );

  let updated = 0;
  let completed = 0;

  for (const fd of matches) {
    const internalStage = mapStageToInternal(fd.stage);
    if (!internalStage || internalStage === "GROUP") continue;

    const teamA = ext2int.get(fd.homeTeam.id) ?? null;
    const teamB = ext2int.get(fd.awayTeam.id) ?? null;
    const scoreA = fd.score.fullTime.home;
    const scoreB = fd.score.fullTime.away;
    const finished = isFinishedStatus(fd.status);

    let qualifier: number | null = null;
    if (finished && scoreA != null && scoreB != null && teamA && teamB) {
      if (fd.score.winner === "HOME_TEAM") qualifier = teamA;
      else if (fd.score.winner === "AWAY_TEAM") qualifier = teamB;
      else if (
        fd.score.duration === "PENALTY_SHOOTOUT" &&
        fd.score.penalties
      ) {
        const pa = fd.score.penalties.home ?? 0;
        const pb = fd.score.penalties.away ?? 0;
        qualifier = pa > pb ? teamA : pb > pa ? teamB : null;
      }
    }

    let target = byExt.get(fd.id);

    if (!target) {
      const candidates = ours.filter((o) => o.stage === internalStage);
      const matchingTeams = candidates.filter((o) => {
        if (!teamA || !teamB) return false;
        const teams = new Set([o.team_a_id, o.team_b_id].filter(Boolean));
        return teams.has(teamA) && teams.has(teamB);
      });

      let pool = matchingTeams.length > 0 ? matchingTeams : candidates;
      if (pool.length === 0) continue;

      pool = pool
        .filter((o) => o.external_id == null)
        .sort(
          (a, b) =>
            Math.abs(
              new Date(a.kickoff_at).getTime() - new Date(fd.utcDate).getTime(),
            ) -
            Math.abs(
              new Date(b.kickoff_at).getTime() - new Date(fd.utcDate).getTime(),
            ),
        );
      target = pool[0];
      if (!target) continue;

      await query(
        `update knockout_matches set external_id = $1 where id = $2`,
        [fd.id, target.id],
      );
      target.external_id = fd.id;
      byExt.set(fd.id, target);
    }

    await query(
      `update knockout_matches set
         kickoff_at        = $1,
         team_a_id         = coalesce($2, team_a_id),
         team_b_id         = coalesce($3, team_b_id),
         score_a           = $4,
         score_b           = $5,
         qualifier_team_id = $6,
         last_synced_at    = now()
       where id = $7`,
      [
        fd.utcDate,
        teamA,
        teamB,
        finished ? scoreA : null,
        finished ? scoreB : null,
        qualifier,
        target.id,
      ],
    );
    updated++;
    if (finished) completed++;
  }

  return { updated, completed };
}

export async function runSync(): Promise<SyncReport> {
  const compRow = await queryOne<{ value: string }>(
    `select value from settings where key = 'fd_competition_code'`,
  );
  const seasonRow = await queryOne<{ value: string }>(
    `select value from settings where key = 'fd_season'`,
  );
  const competition = compRow?.value ?? "WC";
  const season = seasonRow?.value ?? "2026";

  const matches = await fetchCompetitionMatches(competition, season);
  const teamsLinked = await linkTeams(matches);
  const groupsUpdated = await syncGroupResults(competition, season);
  const ko = await syncKnockoutResults(matches);

  const ranAt = new Date().toISOString();
  await query(
    `insert into settings (key, value) values ('last_sync_at', $1)
       on conflict (key) do update set value = excluded.value`,
    [ranAt],
  );

  return {
    ok: true,
    competition,
    season,
    fetched_matches: matches.length,
    teams_linked: teamsLinked,
    groups_updated: groupsUpdated,
    knockout_matches_updated: ko.updated,
    knockout_matches_completed: ko.completed,
    ran_at: ranAt,
  };
}
