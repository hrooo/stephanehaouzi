/**
 * Commentaires ironiques façon "Zlatan des Guignols" affichés sur chaque
 * résultat. La sélection est déterministe (hash du seed) pour qu'un même
 * utilisateur voie toujours le même commentaire sur un résultat donné.
 *
 * Le ton : self-aggrandizing à la 3e personne, condescendant, jamais méchant.
 */

// 3 pts : qualifié ET score exact
const KNOCKOUT_3 = [
  "3/3. Zlatan il salue. Zlatan il salue rarement. Profite, ça arrivera plus.",
  "Bon qualifié et score pile poil. Zlatan il dit : « normal, t'as copié sur Zlatan ».",
  "Zlatan il aurait fait pareil. Mais sans regarder. En mangeant. Avec une seule main.",
  "Le carton plein. Zlatan il applaudit. Zlatan il applaudit jamais d'habitude. Tu lui dois une fière chandelle.",
  "3 points pile. Zlatan il a presque envie de te féliciter. Zlatan il a dit PRESQUE.",
  "Tu as trouvé tout. Zlatan il soupçonne un coup de chance cosmique. Zlatan il croit pas au hasard.",
];

// 1 pt : bon qualifié mais mauvais score
const KNOCKOUT_1 = [
  "1 point. Zlatan il regarde ailleurs. Zlatan il regarde Zlatan dans le miroir.",
  "Tu as trouvé le qualifié, pas le score. Zlatan il appelle ça : médiocre avec espoir.",
  "1 petit point. Zlatan il en aurait mis 3. Mais Zlatan il joue pas dans la même cour.",
  "Bon, t'as eu le qualifié. Zlatan il dit que même un perroquet aurait pu.",
  "Le qualifié, oui. Le score, non. Zlatan il appelle ça la moitié du chemin. Et l'autre moitié, c'est Zlatan.",
];

// 0 pt : mauvais qualifié (peu importe le score)
const KNOCKOUT_0 = [
  "Zéro pointé. Zlatan il dit rien. Zlatan il dit rien parce qu'il y a rien à dire.",
  "0 point. Zlatan il aurait pleuré. Mais Zlatan il pleure jamais. Donc il pleure pas.",
  "Le néant total. Zlatan il propose un cours particulier. Zlatan il est patient. Pas avec tout le monde.",
  "Ton prono était aussi loin de la réalité que toi de Zlatan.",
  "Zlatan il a vu pire. Mais c'était y a longtemps. Et c'était pas Zlatan.",
  "Mauvais qualifié. Zlatan il dit : « la prochaine fois, regarde un match avant de parier ».",
];

const GROUP_3 = [
  "Top 2 dans l'ordre. Zlatan il dit : « bien joué, mais c'était évident pour Zlatan ».",
  "3 points sec. Zlatan il hoche la tête. C'est rare. Encadre l'instant.",
  "Pronostic propre. Zlatan il aurait fait pareil. Plus vite. Sans dire merci.",
];

const GROUP_2 = [
  "Bon top 2 mais inversé. Zlatan il dit : « presque. Mais presque, c'est pour les autres ».",
  "2 points. Zlatan il aurait mis dans l'ordre. Zlatan il met toujours dans l'ordre.",
  "Tu avais les bonnes équipes. Zlatan il dit : « la prochaine fois, l'ordre aussi ».",
];

const GROUP_1 = [
  "1 seule équipe trouvée. Zlatan il dit : « 50%, c'est la moyenne pour ceux qui ne sont pas Zlatan ».",
  "1 point. Zlatan il a connu pire. Mais c'était lui-même bébé.",
  "Tu as une équipe. Zlatan il en avait deux. Mais Zlatan c'est Zlatan.",
];

const GROUP_0 = [
  "0 sur 2. Zlatan il regarde ses pronostics à lui. Ils sont parfaits. Évidemment.",
  "Aucune équipe trouvée. Zlatan il propose de t'expliquer la géographie du foot.",
  "Le grand zéro. Zlatan il dit : « la prochaine fois, demande à Zlatan avant ».",
];

const CARRE_HIGH = [
  "Tu as trouvé tes demi-finalistes. Zlatan il valide. Zlatan il valide presque jamais.",
  "Carré d'As réussi. Zlatan il dit : « tu commences à parler la langue de Zlatan ».",
  "10 points pour le carré. Zlatan il a fait pareil. En 1998. Sans se concentrer.",
];

const CARRE_MED = [
  "Quelques bons demi-finalistes. Zlatan il dit : « presque, mais presque c'est pas Zlatan ».",
  "Pas mal sur le carré. Zlatan il aurait fait mieux. Zlatan il fait toujours mieux.",
];

const CARRE_LOW = [
  "Carré d'As : néant. Zlatan il a un mot pour ça. Le mot, c'est : « bof ».",
  "Tu as raté le carré. Zlatan il dit : « la prochaine fois, regarde un match avant de parier ».",
  "Aucun demi-finaliste trouvé. Zlatan il offre une consolation. Zlatan il offre rarement.",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickFrom<T>(pool: T[], seed: string): T {
  return pool[hashString(seed) % pool.length];
}

export type ResultContext =
  | { kind: "knockout"; matchId: number; userId: string }
  | { kind: "group"; groupLetter: string; userId: string }
  | { kind: "carre"; userId: string };

export function zlatanCommentForKnockout(
  points: number,
  ctx: { matchId: number; userId: string },
): string {
  const seed = `kn:${ctx.userId}:${ctx.matchId}:${points}`;
  if (points >= 3) return pickFrom(KNOCKOUT_3, seed);
  if (points === 1) return pickFrom(KNOCKOUT_1, seed);
  return pickFrom(KNOCKOUT_0, seed);
}

export function zlatanCommentForGroup(
  points: number,
  ctx: { groupLetter: string; userId: string },
): string {
  const seed = `gr:${ctx.userId}:${ctx.groupLetter}:${points}`;
  if (points >= 3) return pickFrom(GROUP_3, seed);
  if (points === 2) return pickFrom(GROUP_2, seed);
  if (points === 1) return pickFrom(GROUP_1, seed);
  return pickFrom(GROUP_0, seed);
}

export function zlatanCommentForCarre(
  points: number,
  ctx: { userId: string },
): string {
  const seed = `ca:${ctx.userId}:${points}`;
  if (points >= 7) return pickFrom(CARRE_HIGH, seed);
  if (points >= 1) return pickFrom(CARRE_MED, seed);
  return pickFrom(CARRE_LOW, seed);
}
