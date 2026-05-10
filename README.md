# Coupe du Monde 2026 — Famille 🏆

Plateforme de paris familiale pour la Coupe du Monde 2026, réservée aux membres
inscrits. Stack : **Next.js 16** + **PostgreSQL** (sans Supabase, juste `pg`) +
auth maison (bcrypt + cookie JWT) + **avatars DiceBear** + **auto-sync** des
résultats via football-data.org.

## Règles intégrées

**Phase de poule** — pour chaque poule (12 poules de 4) tu pronostiques les
deux premiers :

- 🥇 **3 pts** : top 2 dans le bon ordre
- 🥈 **2 pts** : top 2 corrects mais inversés
- 🥉 **1 pt** : une seule équipe correcte
- 0 pt : aucune

**Phase à élimination directe** — pour chaque match (1/16 → finale) :

- 🎯 **3 pts** si bon qualifié **et** bon score exact
- ✅ **1 pt** si bon qualifié, mauvais score
- 0 pt si mauvais qualifié (le qualifié doit être correct pour marquer — pas de cumul)

**Bonus Carré d'As** — à pronostiquer **avant le coup d'envoi du tournoi** :

- 4 demi-finalistes corrects → **10 pts**
- 3 → **7 pts** · 2 → **4 pts** · 1 → **1 pt** · 0 → 0 pt

Les pronostics de poule et de Carré d'As sont **verrouillés** au coup d'envoi du
tournoi (11 juin 2026 17h UTC, configurable dans `settings`). Les pronostics
d'élimination directe sont verrouillés match par match au coup d'envoi.

## Avatars

Chaque membre a un avatar SVG généré automatiquement (DiceBear), qu'il peut
personnaliser depuis `/profile` :

- **8 styles** au choix : Emojis fun, Robots, Portraits, Minimaliste, Cartoon
  souriant, Avataaars classiques, Pixel art, Pouce.
- Le dessin dépend du **pseudo de seed** : change-le pour piocher un autre
  visage du même style.
- Aucun upload, aucun stockage : tout est rendu côté serveur en SVG.

## Synchro automatique des scores

L'app peut récupérer les scores officiels toute seule depuis
**football-data.org** (gratuit) :

1. Crée une clé API gratuite : <https://www.football-data.org/client/register>
2. Ajoute `FOOTBALL_DATA_API_KEY` à tes variables d'env (et `CRON_SECRET` si tu
   déploies sur Vercel).
3. Sur Vercel, le fichier `vercel.json` configure un cron qui appelle
   `/api/sync-results` **toutes les 15 minutes**.
4. L'admin peut aussi cliquer sur "Synchroniser maintenant" depuis `/admin`.

Ce que la synchro fait :

- Lie automatiquement nos 48 équipes aux IDs football-data via leurs noms /
  codes (avec une table d'alias FR/EN).
- Met à jour le **classement officiel des poules** (top 2 par poule).
- Met à jour les **matchs à élimination** : équipes, date de coup d'envoi,
  score final et équipe qualifiée (en gérant prolongations + tirs au but).
- Stocke `last_sync_at` dans `settings` et l'affiche dans `/admin`.

Si la clé API n'est pas configurée ou si le cron tombe en erreur, la saisie
manuelle dans `/admin` reste totalement fonctionnelle.

## Démarrage en local

### 1. Postgres

Tu as besoin d'un Postgres ≥ 14. Au choix :

- **Local** : `brew install postgresql` (mac) puis `createdb coupe_du_monde`
- **Docker** : `docker run -d --name cdm-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=coupe_du_monde postgres:16`
- **Hébergé gratuitement** : Neon (neon.tech), Vercel Postgres, Render, Railway…

### 2. Variables d'environnement

```bash
cp .env.local.example .env.local
# édite .env.local pour mettre :
#   DATABASE_URL=postgres://...
#   AUTH_SECRET=<génère un secret avec : openssl rand -base64 32>
```

### 3. Initialiser la base

```bash
npm install
npm run db:setup     # crée les tables et insère les 48 équipes + 32 matchs élim
npm run dev          # http://localhost:3000
```

### 4. Premier compte = admin

Le tout premier compte créé sur `/signup` devient automatiquement
**administrateur** (accès à `/admin` pour saisir les résultats officiels et
ajuster la grille élim).

## Structure

```
src/
  app/
    (app)/                     ← zone connectée
      dashboard/page.tsx       → vue d'ensemble + mon score
      leaderboard/page.tsx     → classement (avec snapshot par phase)
      profile/page.tsx         → choix d'avatar DiceBear
      predictions/
        groups/page.tsx        → top 2 par poule
        carre/page.tsx         → bonus Carré d'As
        knockout/page.tsx      → score + qualifié pour chaque match élim
      admin/page.tsx           → saisie résultats + bouton "sync now"
    api/
      sync-results/route.ts    → endpoint cron (auth admin OU bearer secret)
    login/page.tsx
    signup/page.tsx
    page.tsx                   ← landing publique
  components/
    Avatar.tsx                 → composant SVG (rendu serveur)
  lib/
    db.ts                      → pool Postgres
    auth.ts                    → bcrypt + JWT cookie
    avatar.ts                  → wrappers DiceBear + 8 styles
    scoring.ts                 → moteur de calcul des points + snapshot par phase
    football-data.ts           → client API football-data.org
    sync.ts                    → matching équipes + mise à jour des résultats
sql/
  01_schema.sql                → schéma de base (idempotent)
  02_seed_teams.sql            → 48 équipes / 12 groupes
  03_seed_knockout.sql         → 32 matchs élim avec dates indicatives
  04_avatars_and_sync.sql      → colonnes avatar + external_id (sync)
scripts/
  setup-db.ts                  → exécute les 4 fichiers SQL
vercel.json                    → cron toutes les 15 min vers /api/sync-results
```

## Adapter le tirage au sort réel

Le seed propose une répartition **plausible** des 48 équipes dans les 12
groupes. Si le vrai tirage diffère, deux options :

1. **Via SQL** : modifie `sql/02_seed_teams.sql` puis relance `npm run db:setup`
   (le `on conflict (code) do update` met à jour sans dupliquer).
2. **Via l'admin** : depuis `/admin`, tu peux ajuster les équipes assignées à
   chaque match d'élimination directe, mais pas (encore) les groupes des 48
   équipes — passer par SQL est le plus rapide pour ça.

## Déploiement

### Vercel

1. Push ce repo sur GitHub
2. Sur Vercel, "Add New Project", choisis ce repo
3. Variables d'environnement : `DATABASE_URL` (ex: Neon), `AUTH_SECRET`
4. Vercel déploie. Lance `npm run db:setup` une seule fois en local pointant
   vers la base de prod (ou exécute les `.sql` via la console Postgres).

### Self-hosted (VPS)

```bash
npm run build
PORT=3000 NODE_ENV=production npm start
```

Reverse-proxy Nginx + certbot, et c'est bon.

## Sécurité

- Mots de passe bcrypt (10 rounds)
- Sessions JWT signées HS256 dans un cookie `httpOnly`, `sameSite=lax`,
  `secure` en prod
- Le middleware redirige vers `/login` toute route non publique
- Seul l'admin (1<sup>er</sup> compte) peut accéder à `/admin`

## Licence

Code privé pour usage familial.
