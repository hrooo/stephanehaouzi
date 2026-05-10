import { query, queryOne } from "@/lib/db";
import { getGroupLockAt } from "@/lib/scoring";

export type Reminder = {
  level: "info" | "warn" | "urgent";
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

export type ImminentMatch = {
  id: number;
  label: string;
  stage: string;
  kickoff_at: string;
  team_a_name: string;
  team_b_name: string;
  flag_a: string;
  flag_b: string;
  has_prediction: boolean;
};

/** Calcule les rappels à afficher dans le dashboard pour un user donné. */
export async function getRemindersFor(
  userId: string,
): Promise<{ reminders: Reminder[]; imminent: ImminentMatch[] }> {
  const reminders: Reminder[] = [];
  const lockAt = await getGroupLockAt();
  const now = new Date();
  const lockMs = lockAt.getTime() - now.getTime();
  const lockSoon = lockMs > 0 && lockMs < 1000 * 60 * 60 * 48; // < 48h
  const lockPassed = lockMs <= 0;

  // 1) Pronos de poule incomplets
  if (!lockPassed) {
    const groupCount = await queryOne<{ n: string; total: string }>(
      `select
         (select count(*) from group_predictions where user_id = $1)::text as n,
         (select count(distinct group_letter) from teams where group_letter is not null)::text as total`,
      [userId],
    );
    const done = Number(groupCount?.n ?? 0);
    const total = Number(groupCount?.total ?? 12);
    if (done < total) {
      const missing = total - done;
      reminders.push({
        level: lockSoon ? "urgent" : "warn",
        icon: "📝",
        title: `Pronos de poule : ${missing} groupe${missing > 1 ? "s" : ""} restant${missing > 1 ? "s" : ""}`,
        body: `Tu n'as pas encore pronostiqué le top 2 de ${missing} poule${missing > 1 ? "s" : ""}. ${formatDeadline(lockAt)}`,
        href: "/predictions/groups",
        cta: "Compléter mes pronos",
      });
    }
  }

  // 2) Carré d'As pas fait
  if (!lockPassed) {
    const carre = await queryOne<{ user_id: string }>(
      `select user_id::text from carre_predictions where user_id = $1`,
      [userId],
    );
    if (!carre) {
      reminders.push({
        level: lockSoon ? "urgent" : "warn",
        icon: "🃏",
        title: "Carré d'As pas encore fait",
        body: `Pronostique tes 4 demi-finalistes — c'est le bonus à 10 pts. ${formatDeadline(lockAt)}`,
        href: "/predictions/carre",
        cta: "Faire mon Carré d'As",
      });
    }
  }

  // 3) Matchs élim imminents (< 48h, équipes connues, pas de prono)
  const imminent = await query<ImminentMatch>(
    `select m.id, m.label, m.stage, m.kickoff_at,
            ta.name as team_a_name, tb.name as team_b_name,
            ta.flag as flag_a, tb.flag as flag_b,
            (kp.user_id is not null) as has_prediction
       from knockout_matches m
       join teams ta on ta.id = m.team_a_id
       join teams tb on tb.id = m.team_b_id
       left join knockout_predictions kp
         on kp.match_id = m.id and kp.user_id = $1
       where m.team_a_id is not null
         and m.team_b_id is not null
         and m.score_a is null
         and m.kickoff_at > now()
         and m.kickoff_at < now() + interval '48 hours'
       order by m.kickoff_at asc`,
    [userId],
  );

  const pendingImminent = imminent.filter((m) => !m.has_prediction);
  if (pendingImminent.length > 0) {
    const next = pendingImminent[0];
    const hoursLeft = Math.max(
      0,
      Math.round(
        (new Date(next.kickoff_at).getTime() - now.getTime()) / (1000 * 60 * 60),
      ),
    );
    reminders.push({
      level: hoursLeft < 6 ? "urgent" : "warn",
      icon: "⚽",
      title: `${pendingImminent.length} match${pendingImminent.length > 1 ? "s" : ""} élim. à pronostiquer`,
      body: `Le prochain : ${next.flag_a} ${next.team_a_name} vs ${next.flag_b} ${next.team_b_name} dans ~${hoursLeft}h.`,
      href: "/predictions/knockout",
      cta: "Pronostiquer",
    });
  }

  return { reminders, imminent };
}

function formatDeadline(d: Date): string {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "(verrouillé)";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (days > 0) return `Verrouillé dans ${days}j ${hours}h.`;
  if (hours > 0) return `⚠️ Plus que ${hours}h !`;
  const mins = Math.floor((ms / (1000 * 60)) % 60);
  return `🚨 Plus que ${mins} min !`;
}
