-- Migration : avatars DiceBear + intégration football-data.org
-- Idempotente.

-- 1. Avatars : style + seed (le rendu se fait côté serveur via @dicebear/core)
alter table profiles
  add column if not exists avatar_style text not null default 'fun-emoji',
  add column if not exists avatar_seed  text;

update profiles
  set avatar_seed = display_name
  where avatar_seed is null or avatar_seed = '';

-- 2. Identifiants externes pour la synchro automatique des résultats
alter table teams
  add column if not exists external_id integer;

alter table knockout_matches
  add column if not exists external_id integer,
  add column if not exists last_synced_at timestamptz;

create unique index if not exists teams_external_id_key
  on teams (external_id) where external_id is not null;

create unique index if not exists knockout_matches_external_id_key
  on knockout_matches (external_id) where external_id is not null;

-- 3. Réglages utiles à la synchro
insert into settings (key, value)
values
  ('fd_competition_code', 'WC'),
  ('fd_season',           '2026'),
  ('last_sync_at',        '')
on conflict (key) do nothing;
