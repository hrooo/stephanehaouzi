# Coupe du Monde 2026 — Famille 🏆

Plateforme de paris familiale pour la Coupe du Monde 2026, réservée aux membres
inscrits. Stack : **Next.js 15** + **PostgreSQL** (sans Supabase, juste `pg`) +
auth maison (bcrypt + cookie JWT).

## Règles intégrées

**Phase de poule** — pour chaque poule (12 poules de 4) tu pronostiques les
deux premiers :

- 🥇 **3 pts** : top 2 dans le bon ordre
- 🥈 **2 pts** : top 2 corrects mais inversés
- 🥉 **1 pt** : une seule équipe correcte
- 0 pt : aucune

**Phase à élimination directe** — pour chaque match (1/16 → finale) :

- 🎯 **3 pts** si bon score exact
- ✅ **1 pt** si bonne équipe qualifiée

**Bonus Carré d'As** — à pronostiquer **avant le coup d'envoi du tournoi** :

- 4 demi-finalistes corrects → **10 pts**
- 3 → **7 pts** · 2 → **4 pts** · 1 → **1 pt** · 0 → 0 pt

Les pronostics de poule et de Carré d'As sont **verrouillés** au coup d'envoi du
tournoi (11 juin 2026 17h UTC, configurable dans `settings`). Les pronostics
d'élimination directe sont verrouillés match par match au coup d'envoi.

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
      leaderboard/page.tsx     → classement famille
      predictions/
        groups/page.tsx        → top 2 par poule
        carre/page.tsx         → bonus Carré d'As
        knockout/page.tsx      → score + qualifié pour chaque match élim
      admin/page.tsx           → saisie résultats (admin uniquement)
    login/page.tsx
    signup/page.tsx
    page.tsx                   ← landing publique
  lib/
    db.ts                      → pool Postgres
    auth.ts                    → bcrypt + JWT cookie
    scoring.ts                 → moteur de calcul des points
sql/
  01_schema.sql                → schéma complet (idempotent)
  02_seed_teams.sql            → 48 équipes / 12 groupes
  03_seed_knockout.sql         → 32 matchs élim avec dates indicatives
scripts/
  setup-db.ts                  → exécute les 3 fichiers SQL
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
