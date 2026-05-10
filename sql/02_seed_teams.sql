-- Seed des 48 équipes qualifiées pour la Coupe du Monde 2026
-- Tirage au sort : à ajuster via la page admin si besoin (le vrai tirage a eu
-- lieu en décembre 2025 ; ce fichier propose une répartition plausible).

insert into teams (name, code, flag, group_letter) values
  -- Groupe A
  ('Mexique',        'MEX', '🇲🇽', 'A'),
  ('Croatie',        'CRO', '🇭🇷', 'A'),
  ('Égypte',         'EGY', '🇪🇬', 'A'),
  ('Arabie saoudite','KSA', '🇸🇦', 'A'),
  -- Groupe B
  ('Canada',         'CAN', '🇨🇦', 'B'),
  ('Sénégal',        'SEN', '🇸🇳', 'B'),
  ('Pays de Galles', 'WAL', '🏴', 'B'),
  ('Nouvelle-Zélande','NZL','🇳🇿', 'B'),
  -- Groupe C
  ('États-Unis',     'USA', '🇺🇸', 'C'),
  ('Iran',           'IRN', '🇮🇷', 'C'),
  ('Australie',      'AUS', '🇦🇺', 'C'),
  ('Costa Rica',     'CRC', '🇨🇷', 'C'),
  -- Groupe D
  ('Espagne',        'ESP', '🇪🇸', 'D'),
  ('Corée du Sud',   'KOR', '🇰🇷', 'D'),
  ('Türkiye',        'TUR', '🇹🇷', 'D'),
  ('Irak',           'IRQ', '🇮🇶', 'D'),
  -- Groupe E
  ('France',         'FRA', '🇫🇷', 'E'),
  ('Suisse',         'SUI', '🇨🇭', 'E'),
  ('Cameroun',       'CMR', '🇨🇲', 'E'),
  ('Bolivie',        'BOL', '🇧🇴', 'E'),
  -- Groupe F
  ('Angleterre',     'ENG', '🏴', 'F'),
  ('Japon',          'JPN', '🇯🇵', 'F'),
  ('Tunisie',        'TUN', '🇹🇳', 'F'),
  ('Honduras',       'HON', '🇭🇳', 'F'),
  -- Groupe G
  ('Argentine',      'ARG', '🇦🇷', 'G'),
  ('Maroc',          'MAR', '🇲🇦', 'G'),
  ('Norvège',        'NOR', '🇳🇴', 'G'),
  ('Panama',         'PAN', '🇵🇦', 'G'),
  -- Groupe H
  ('Brésil',         'BRA', '🇧🇷', 'H'),
  ('Uruguay',        'URU', '🇺🇾', 'H'),
  ('Algérie',        'ALG', '🇩🇿', 'H'),
  ('RD Congo',       'COD', '🇨🇩', 'H'),
  -- Groupe I
  ('Portugal',       'POR', '🇵🇹', 'I'),
  ('Italie',         'ITA', '🇮🇹', 'I'),
  ('Nigeria',        'NGA', '🇳🇬', 'I'),
  ('Ouzbékistan',    'UZB', '🇺🇿', 'I'),
  -- Groupe J
  ('Pays-Bas',       'NED', '🇳🇱', 'J'),
  ('Colombie',       'COL', '🇨🇴', 'J'),
  ('Autriche',       'AUT', '🇦🇹', 'J'),
  ('Qatar',          'QAT', '🇶🇦', 'J'),
  -- Groupe K
  ('Belgique',       'BEL', '🇧🇪', 'K'),
  ('Équateur',       'ECU', '🇪🇨', 'K'),
  ('Ghana',          'GHA', '🇬🇭', 'K'),
  ('Paraguay',       'PAR', '🇵🇾', 'K'),
  -- Groupe L
  ('Allemagne',      'GER', '🇩🇪', 'L'),
  ('Danemark',       'DEN', '🇩🇰', 'L'),
  ('Pologne',        'POL', '🇵🇱', 'L'),
  ('Côte d''Ivoire', 'CIV', '🇨🇮', 'L')
on conflict (code) do update
  set name         = excluded.name,
      flag         = excluded.flag,
      group_letter = excluded.group_letter;

-- Squelettes des résultats de poule (vides à remplir après les matchs)
insert into group_results (group_letter)
select chr(ascii('A') + g) from generate_series(0, 11) g
on conflict do nothing;
