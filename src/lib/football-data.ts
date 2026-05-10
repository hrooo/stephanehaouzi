/**
 * Client minimal pour football-data.org (v4).
 * Doc : https://www.football-data.org/documentation/quickstart
 *
 * Free tier : 10 requêtes/min, suffisant pour un cron léger toutes les 15 min.
 * Configure FOOTBALL_DATA_API_KEY dans tes variables d'environnement.
 */

const BASE_URL = "https://api.football-data.org/v4";

export type FdMatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "EXTRA_TIME"
  | "PENALTY_SHOOTOUT"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export type FdTeam = {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

export type FdScore = {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
  regularTime?: { home: number | null; away: number | null };
  extraTime?: { home: number | null; away: number | null };
  penalties?: { home: number | null; away: number | null };
};

export type FdMatch = {
  id: number;
  utcDate: string;
  status: FdMatchStatus;
  matchday?: number | null;
  stage?: string;
  group?: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
};

export type FdStanding = {
  group?: string | null;
  type?: string;
  table: Array<{
    position: number;
    team: FdTeam;
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
};

export class FootballDataError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`football-data.org error ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FOOTBALL_DATA_API_KEY manquant. Crée une clé gratuite sur football-data.org/client/register.",
    );
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new FootballDataError(res.status, body);
  }
  return (await res.json()) as T;
}

/** Tous les matchs d'une compétition (séason optionnelle, e.g. "2026"). */
export async function fetchCompetitionMatches(
  competitionCode: string,
  season?: string,
): Promise<FdMatch[]> {
  const qs = season ? `?season=${encodeURIComponent(season)}` : "";
  const data = await request<{ matches: FdMatch[] }>(
    `/competitions/${encodeURIComponent(competitionCode)}/matches${qs}`,
  );
  return data.matches ?? [];
}

/** Classements (groupes) d'une compétition. */
export async function fetchCompetitionStandings(
  competitionCode: string,
  season?: string,
): Promise<FdStanding[]> {
  const qs = season ? `?season=${encodeURIComponent(season)}` : "";
  const data = await request<{ standings: FdStanding[] }>(
    `/competitions/${encodeURIComponent(competitionCode)}/standings${qs}`,
  );
  return data.standings ?? [];
}

/** Mappe un stage football-data.org vers nos codes internes. */
export function mapStageToInternal(fdStage: string | undefined): string | null {
  if (!fdStage) return null;
  const s = fdStage.toUpperCase();
  if (s.includes("GROUP")) return "GROUP";
  if (s.includes("LAST_16") || s.includes("ROUND_OF_16")) return "R16";
  if (s.includes("LAST_32") || s.includes("ROUND_OF_32")) return "R32";
  if (s.includes("QUARTER")) return "QF";
  if (s.includes("SEMI")) return "SF";
  if (s.includes("THIRD") || s.includes("3RD")) return "3RD";
  if (s.includes("FINAL")) return "F";
  return null;
}

export function isFinishedStatus(status: FdMatchStatus): boolean {
  return status === "FINISHED" || status === "AWARDED";
}
