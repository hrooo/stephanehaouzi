-- Schéma Postgres : Coupe du Monde 2026 Famille
-- Idempotent : peut être ré-exécuté sans erreur.

create extension if not exists pgcrypto;

-- Profils utilisateurs (auth maison, pas Supabase)
create table if not exists profiles (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text not null,
  password_hash text not null,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 48 équipes participantes, réparties dans 12 groupes (A à L)
create table if not exists teams (
  id            serial primary key,
  name          text not null,
  code          text not null unique,
  flag          text not null default '',
  group_letter  text check (group_letter ~ '^[A-L]$')
);

-- Pronostics phase de poule : top 2 par groupe
create table if not exists group_predictions (
  user_id         uuid not null references profiles(id) on delete cascade,
  group_letter    text not null,
  first_team_id   integer not null references teams(id),
  second_team_id  integer not null references teams(id),
  updated_at      timestamptz not null default now(),
  primary key (user_id, group_letter),
  check (first_team_id <> second_team_id)
);

-- Résultats officiels phase de poule (saisis par l'admin)
create table if not exists group_results (
  group_letter   text primary key,
  first_team_id  integer references teams(id),
  second_team_id integer references teams(id)
);

-- Matchs à élimination directe (32es, 16es, quarts, demis, 3e place, finale)
create table if not exists knockout_matches (
  id                 serial primary key,
  stage              text not null check (stage in ('R32','R16','QF','SF','3RD','F')),
  label              text not null,
  kickoff_at         timestamptz not null,
  team_a_id          integer references teams(id),
  team_b_id          integer references teams(id),
  score_a            integer,
  score_b            integer,
  qualifier_team_id  integer references teams(id)
);

create index if not exists knockout_matches_stage_idx
  on knockout_matches (stage, kickoff_at);

-- Pronostics phase à élimination directe
create table if not exists knockout_predictions (
  user_id            uuid not null references profiles(id) on delete cascade,
  match_id           integer not null references knockout_matches(id) on delete cascade,
  score_a            integer not null check (score_a >= 0),
  score_b            integer not null check (score_b >= 0),
  qualifier_team_id  integer not null references teams(id),
  updated_at         timestamptz not null default now(),
  primary key (user_id, match_id)
);

-- Bonus "Carré d'As" : pronostic des 4 demi-finalistes (avant le tournoi)
-- Barème : 10 pts (4 bonnes), 7 pts (3), 4 pts (2), 1 pt (1), 0 pt (0)
create table if not exists carre_predictions (
  user_id     uuid primary key references profiles(id) on delete cascade,
  team1_id    integer not null references teams(id),
  team2_id    integer not null references teams(id),
  team3_id    integer not null references teams(id),
  team4_id    integer not null references teams(id),
  updated_at  timestamptz not null default now(),
  check (team1_id <> team2_id and team1_id <> team3_id and team1_id <> team4_id
     and team2_id <> team3_id and team2_id <> team4_id and team3_id <> team4_id)
);

-- Résultats officiels du Carré d'As (les 4 vraies demi-finalistes)
create table if not exists carre_results (
  id          smallint primary key default 1 check (id = 1),
  team1_id    integer references teams(id),
  team2_id    integer references teams(id),
  team3_id    integer references teams(id),
  team4_id    integer references teams(id)
);

insert into carre_results (id) values (1) on conflict do nothing;

-- Réglages globaux (clé/valeur)
create table if not exists settings (
  key   text primary key,
  value text not null
);

-- Date limite de verrouillage des pronostics phase de poule + Carré d'As
insert into settings (key, value)
values ('group_lock_at', '2026-06-11T17:00:00Z')
on conflict (key) do nothing;
