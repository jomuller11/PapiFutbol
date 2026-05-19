-- =============================================================================
-- Tablas snapshot para estadísticas importadas del sitio oficial.
-- Se borran y re-insertan completas en cada sync.
-- =============================================================================

create table public.stats_standings (
  id uuid primary key default uuid_generate_v4(),
  zone text not null,           -- 'Zona 1', 'Zona 2'
  rank smallint not null,
  team_name text not null,
  pts smallint not null default 0,
  pj smallint not null default 0,
  pg smallint not null default 0,
  pe smallint not null default 0,
  pp smallint not null default 0,
  gf smallint not null default 0,
  gc smallint not null default 0,
  fp smallint not null default 0,
  synced_at timestamptz not null default now()
);

create table public.stats_scorers (
  id uuid primary key default uuid_generate_v4(),
  rank smallint not null,
  player_name text not null,
  team_name text not null,
  goals smallint not null default 0,
  synced_at timestamptz not null default now()
);

create table public.stats_fairplay (
  id uuid primary key default uuid_generate_v4(),
  rank smallint not null,
  team_name text not null,
  yellow smallint not null default 0,
  blue smallint not null default 0,
  red smallint not null default 0,
  score smallint not null default 0,
  synced_at timestamptz not null default now()
);

create table public.stats_goalkeepers (
  id uuid primary key default uuid_generate_v4(),
  rank smallint not null,
  player_name text not null,
  team_name text not null,
  goals_against smallint not null default 0,
  synced_at timestamptz not null default now()
);

create table public.stats_sanctions (
  id uuid primary key default uuid_generate_v4(),
  rank smallint not null,
  player_name text not null,
  team_name text not null,
  yellow smallint not null default 0,
  blue smallint not null default 0,
  red smallint not null default 0,
  fechas smallint not null default 0,
  cumplidas smallint not null default 0,
  synced_at timestamptz not null default now()
);

-- RLS: lectura pública, escritura solo staff/admin
alter table public.stats_standings   enable row level security;
alter table public.stats_scorers     enable row level security;
alter table public.stats_fairplay    enable row level security;
alter table public.stats_goalkeepers enable row level security;
alter table public.stats_sanctions   enable row level security;

create policy "stats_standings: public read"   on public.stats_standings   for select using (true);
create policy "stats_scorers: public read"     on public.stats_scorers     for select using (true);
create policy "stats_fairplay: public read"    on public.stats_fairplay    for select using (true);
create policy "stats_goalkeepers: public read" on public.stats_goalkeepers for select using (true);
create policy "stats_sanctions: public read"   on public.stats_sanctions   for select using (true);

create policy "stats_standings: staff write"   on public.stats_standings   for all using (is_staff_or_admin()) with check (is_staff_or_admin());
create policy "stats_scorers: staff write"     on public.stats_scorers     for all using (is_staff_or_admin()) with check (is_staff_or_admin());
create policy "stats_fairplay: staff write"    on public.stats_fairplay    for all using (is_staff_or_admin()) with check (is_staff_or_admin());
create policy "stats_goalkeepers: staff write" on public.stats_goalkeepers for all using (is_staff_or_admin()) with check (is_staff_or_admin());
create policy "stats_sanctions: staff write"   on public.stats_sanctions   for all using (is_staff_or_admin()) with check (is_staff_or_admin());
