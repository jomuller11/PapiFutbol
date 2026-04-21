-- =============================================================================
-- Liga.9 — Schema inicial
-- Versión: 1.0.0
-- Fecha: 2026-04-20
-- =============================================================================
-- Copiar y ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard).
-- Antes de correr, asegurate de que Auth esté habilitado (viene por defecto).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONES
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 2. ENUMS
-- -----------------------------------------------------------------------------

create type user_role as enum ('player', 'staff', 'admin');

create type player_position as enum ('ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL');

create type player_foot as enum ('derecho', 'izquierdo', 'ambidiestro');

create type player_reference as enum (
  'padre_alumno',
  'padre_ex_alumno',
  'ex_alumno',
  'docente_colegio',
  'invitado',
  'hermano_marista',
  'esposo_educadora',
  'abuelo_alumno'
);

create type tournament_status as enum ('draft', 'active', 'finished', 'cancelled');

create type phase_type as enum ('groups', 'bracket');

create type phase_status as enum ('pending', 'active', 'finished');

create type registration_status as enum ('pending', 'approved', 'rejected', 'waitlist');

create type match_status as enum ('scheduled', 'played', 'cancelled', 'postponed');

create type card_type as enum ('yellow', 'red', 'blue');

-- -----------------------------------------------------------------------------
-- 3. TABLA PROFILES
-- Extiende auth.users con datos de la app. Se crea automáticamente al registrarse.
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'player',
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil básico de usuarios. 1:1 con auth.users.';

-- -----------------------------------------------------------------------------
-- 4. TABLA PLAYERS
-- Datos específicos del jugador. Solo se crea si profile.role = 'player'.
-- -----------------------------------------------------------------------------

create table public.players (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,

  -- Datos personales
  first_name text not null,
  last_name text not null,
  nickname text,
  dni text not null unique,
  birth_date date not null,
  phone text not null,
  reference player_reference not null,

  -- Datos futbolísticos
  position player_position not null,
  foot player_foot not null,
  score smallint check (score is null or (score >= 1 and score <= 15)),

  -- Foto (path en el storage bucket 'avatars')
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.players is 'Datos del jugador. Puntaje lo asigna staff/admin.';
comment on column public.players.score is '1-15, null hasta que lo asigna el admin.';

create index idx_players_dni on public.players(dni);
create index idx_players_profile on public.players(profile_id);

-- -----------------------------------------------------------------------------
-- 5. TABLA TOURNAMENTS
-- -----------------------------------------------------------------------------

create table public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  year integer not null,
  status tournament_status not null default 'draft',
  start_date date,
  end_date date,

  -- Configuración
  fields_count smallint not null default 4 check (fields_count between 1 and 10),
  time_slots text[] not null default array['10:00', '11:30', '13:00']::text[],
  players_per_team smallint not null default 12,
  max_teams smallint not null default 24,

  regulation_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un solo torneo activo por año
  constraint unique_active_per_year exclude using gist (
    year with =,
    (case when status = 'active' then 1 else null end) with =
  )
);

comment on table public.tournaments is 'Torneos. Solo uno puede estar activo por año.';

create index idx_tournaments_status on public.tournaments(status);
create index idx_tournaments_year on public.tournaments(year);

-- -----------------------------------------------------------------------------
-- 6. TABLA PHASES
-- Fases de un torneo (grupos, cuartos, semi, final).
-- -----------------------------------------------------------------------------

create table public.phases (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  type phase_type not null,
  "order" smallint not null,
  status phase_status not null default 'pending',

  created_at timestamptz not null default now(),

  unique (tournament_id, "order")
);

create index idx_phases_tournament on public.phases(tournament_id);

-- -----------------------------------------------------------------------------
-- 7. TABLA GROUPS (zonas)
-- -----------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  phase_id uuid not null references public.phases(id) on delete cascade,
  name text not null,       -- "A", "B", "C"...
  "order" smallint not null,

  created_at timestamptz not null default now(),

  unique (phase_id, name)
);

create index idx_groups_phase on public.groups(phase_id);

-- -----------------------------------------------------------------------------
-- 8. TABLA BRACKETS (llaves de eliminatoria)
-- -----------------------------------------------------------------------------

create table public.brackets (
  id uuid primary key default uuid_generate_v4(),
  phase_id uuid not null references public.phases(id) on delete cascade,
  name text not null,       -- "Cuartos", "Semi", "Final"
  teams_count smallint not null,

  created_at timestamptz not null default now()
);

create index idx_brackets_phase on public.brackets(phase_id);

-- -----------------------------------------------------------------------------
-- 9. TABLA TEAMS
-- -----------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  short_name text not null check (char_length(short_name) between 2 and 4),
  color text not null default '#3b82f6',
  logo_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tournament_id, name)
);

create index idx_teams_tournament on public.teams(tournament_id);

-- -----------------------------------------------------------------------------
-- 10. GROUP_TEAMS (equipo en una zona)
-- -----------------------------------------------------------------------------

create table public.group_teams (
  group_id uuid not null references public.groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,

  primary key (group_id, team_id)
);

create index idx_group_teams_team on public.group_teams(team_id);

-- -----------------------------------------------------------------------------
-- 11. PLAYER_TOURNAMENT_REGISTRATIONS
-- Inscripción de un jugador a un torneo específico.
-- -----------------------------------------------------------------------------

create table public.player_tournament_registrations (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references public.players(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  status registration_status not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  rejection_reason text,

  -- Un jugador solo puede tener UNA inscripción por torneo
  unique (player_id, tournament_id)
);

create index idx_ptr_tournament on public.player_tournament_registrations(tournament_id);
create index idx_ptr_status on public.player_tournament_registrations(status);

-- -----------------------------------------------------------------------------
-- 12. TEAM_MEMBERSHIPS (plantel)
-- -----------------------------------------------------------------------------

create table public.team_memberships (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  jersey_number smallint check (jersey_number between 1 and 99),
  is_captain boolean not null default false,

  created_at timestamptz not null default now(),

  -- Un jugador no puede estar en dos equipos del mismo torneo
  unique (team_id, player_id)
);

create index idx_tm_team on public.team_memberships(team_id);
create index idx_tm_player on public.team_memberships(player_id);

-- -----------------------------------------------------------------------------
-- 13. MATCHES (partidos)
-- -----------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  phase_id uuid not null references public.phases(id) on delete cascade,

  -- Para fase de grupos: apunta a un grupo.
  -- Para eliminatoria: apunta a un bracket.
  group_id uuid references public.groups(id) on delete cascade,
  bracket_id uuid references public.brackets(id) on delete cascade,

  round_number smallint not null,    -- fecha 1, 2, 3...

  match_date date not null,
  match_time text not null,          -- "10:00"
  field_number smallint not null check (field_number between 1 and 10),

  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,

  status match_status not null default 'scheduled',
  home_score smallint,
  away_score smallint,

  observer_team_id uuid references public.teams(id) on delete set null,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint different_teams check (home_team_id <> away_team_id),
  constraint group_or_bracket check (
    (group_id is not null and bracket_id is null) or
    (group_id is null and bracket_id is not null)
  ),
  constraint scores_when_played check (
    (status = 'played' and home_score is not null and away_score is not null) or
    (status <> 'played')
  )
);

create index idx_matches_tournament on public.matches(tournament_id);
create index idx_matches_phase on public.matches(phase_id);
create index idx_matches_date on public.matches(match_date);
create index idx_matches_teams on public.matches(home_team_id, away_team_id);

-- -----------------------------------------------------------------------------
-- 14. MATCH_GOALS
-- -----------------------------------------------------------------------------

create table public.match_goals (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  minute smallint check (minute between 1 and 120),
  is_own_goal boolean not null default false,

  created_at timestamptz not null default now()
);

create index idx_goals_match on public.match_goals(match_id);
create index idx_goals_player on public.match_goals(player_id);

-- -----------------------------------------------------------------------------
-- 15. MATCH_CARDS (tarjetas)
-- -----------------------------------------------------------------------------

create table public.match_cards (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  type card_type not null,
  minute smallint check (minute between 1 and 120),

  created_at timestamptz not null default now()
);

create index idx_cards_match on public.match_cards(match_id);
create index idx_cards_player on public.match_cards(player_id);

-- -----------------------------------------------------------------------------
-- 16. NOTIFICATIONS
-- -----------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,           -- 'match', 'veedor', 'fixture', 'result', 'team', 'approval'
  title text not null,
  body text not null,
  link text,                    -- path interno para hacer click
  read_at timestamptz,
  sent_email boolean not null default false,

  created_at timestamptz not null default now()
);

create index idx_notif_profile on public.notifications(profile_id, read_at);
create index idx_notif_created on public.notifications(created_at desc);

-- -----------------------------------------------------------------------------
-- 17. STAFF_INVITATIONS
-- -----------------------------------------------------------------------------

create table public.staff_invitations (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  role user_role not null check (role in ('staff', 'admin')),
  invited_by uuid not null references public.profiles(id),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),

  created_at timestamptz not null default now()
);

create index idx_invitations_email on public.staff_invitations(email);
create index idx_invitations_token on public.staff_invitations(token);

-- =============================================================================
-- TRIGGERS Y FUNCIONES
-- =============================================================================

-- Trigger: updated_at automático
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger t_profiles_updated before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger t_players_updated before update on public.players
  for each row execute function public.handle_updated_at();
create trigger t_tournaments_updated before update on public.tournaments
  for each row execute function public.handle_updated_at();
create trigger t_teams_updated before update on public.teams
  for each row execute function public.handle_updated_at();
create trigger t_matches_updated before update on public.matches
  for each row execute function public.handle_updated_at();

-- Trigger: cuando se crea un user en auth.users, crear su profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_role user_role;
begin
  -- Si había invitación pendiente, usar su rol
  select role into invited_role
  from public.staff_invitations
  where email = new.email
    and accepted_at is null
    and expires_at > now()
  limit 1;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, coalesce(invited_role, 'player'));

  -- Marcar invitación como aceptada
  if invited_role is not null then
    update public.staff_invitations
    set accepted_at = now()
    where email = new.email and accepted_at is null;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Función: obtener el rol del usuario actual (se usa en RLS)
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Función: ¿es staff o admin?
create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user_role() in ('staff', 'admin');
$$;

-- Función: ¿es admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user_role() = 'admin';
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.phases enable row level security;
alter table public.groups enable row level security;
alter table public.brackets enable row level security;
alter table public.teams enable row level security;
alter table public.group_teams enable row level security;
alter table public.player_tournament_registrations enable row level security;
alter table public.team_memberships enable row level security;
alter table public.matches enable row level security;
alter table public.match_goals enable row level security;
alter table public.match_cards enable row level security;
alter table public.notifications enable row level security;
alter table public.staff_invitations enable row level security;

-- ------ PROFILES ------
-- Cada uno puede leer y editar su propio profile. Admin puede leer todos.
create policy "profiles: self read" on public.profiles
  for select using (auth.uid() = id or is_staff_or_admin());

create policy "profiles: self update (except role)" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: admin can update role" on public.profiles
  for update using (is_admin());

-- ------ PLAYERS ------
-- Público puede leer columnas no sensibles (view pública). Jugador ve todo el suyo.
-- Nota: la view v_players_public solo expone columnas públicas.
create policy "players: owner can read all" on public.players
  for select using (
    auth.uid() = profile_id or is_staff_or_admin()
  );

create policy "players: staff can read all" on public.players
  for select using (is_staff_or_admin());

create policy "players: owner can insert own" on public.players
  for insert with check (auth.uid() = profile_id);

create policy "players: owner can update own (except score)" on public.players
  for update using (auth.uid() = profile_id)
  with check (
    auth.uid() = profile_id
    and score is not distinct from (select p.score from public.players p where p.profile_id = auth.uid())
  );

create policy "players: staff can update all" on public.players
  for update using (is_staff_or_admin());

-- ------ TOURNAMENTS ------
-- Cualquiera puede leer torneos activos o finalizados. Solo admin escribe.
create policy "tournaments: public read" on public.tournaments
  for select using (status in ('active', 'finished') or is_staff_or_admin());

create policy "tournaments: admin write" on public.tournaments
  for all using (is_admin()) with check (is_admin());

-- ------ PHASES / GROUPS / BRACKETS ------
create policy "phases: public read" on public.phases
  for select using (true);
create policy "phases: admin write" on public.phases
  for all using (is_admin()) with check (is_admin());

create policy "groups: public read" on public.groups
  for select using (true);
create policy "groups: admin write" on public.groups
  for all using (is_admin()) with check (is_admin());

create policy "brackets: public read" on public.brackets
  for select using (true);
create policy "brackets: admin write" on public.brackets
  for all using (is_admin()) with check (is_admin());

-- ------ TEAMS ------
create policy "teams: public read" on public.teams
  for select using (true);
create policy "teams: staff write" on public.teams
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "group_teams: public read" on public.group_teams
  for select using (true);
create policy "group_teams: staff write" on public.group_teams
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());

-- ------ REGISTRATIONS ------
create policy "registrations: public read approved" on public.player_tournament_registrations
  for select using (status = 'approved' or is_staff_or_admin() or auth.uid() in (
    select profile_id from public.players where id = player_id
  ));

create policy "registrations: own insert" on public.player_tournament_registrations
  for insert with check (
    auth.uid() in (select profile_id from public.players where id = player_id)
    and status = 'pending'
  );

create policy "registrations: staff update" on public.player_tournament_registrations
  for update using (is_staff_or_admin());

-- ------ TEAM MEMBERSHIPS ------
create policy "memberships: public read" on public.team_memberships
  for select using (true);
create policy "memberships: staff write" on public.team_memberships
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());

-- ------ MATCHES / GOALS / CARDS ------
create policy "matches: public read" on public.matches
  for select using (true);
create policy "matches: staff write" on public.matches
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "goals: public read" on public.match_goals
  for select using (true);
create policy "goals: staff write" on public.match_goals
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "cards: public read" on public.match_cards
  for select using (true);
create policy "cards: staff write" on public.match_cards
  for all using (is_staff_or_admin()) with check (is_staff_or_admin());

-- ------ NOTIFICATIONS ------
create policy "notifications: own read" on public.notifications
  for select using (auth.uid() = profile_id);
create policy "notifications: own update (mark read)" on public.notifications
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "notifications: staff insert" on public.notifications
  for insert with check (is_staff_or_admin());

-- ------ STAFF INVITATIONS ------
create policy "invitations: admin only" on public.staff_invitations
  for all using (is_admin()) with check (is_admin());

-- =============================================================================
-- VIEWS PÚBLICAS (ocultan campos sensibles)
-- =============================================================================

-- View: jugador público (sin DNI, teléfono, email, fecha de nacimiento, referencia)
create or replace view public.v_players_public
with (security_invoker = on) as
select
  p.id,
  p.first_name,
  p.last_name,
  p.nickname,
  p.position,
  p.foot,
  p.score,
  p.avatar_url
from public.players p;

comment on view public.v_players_public is 'Datos públicos del jugador. Usado en vistas públicas.';

-- View: estadísticas agregadas de jugador por torneo
create or replace view public.v_player_stats
with (security_invoker = on) as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  p.nickname,
  p.position,
  p.score,
  p.avatar_url,
  m.tournament_id,
  count(distinct case when m.status = 'played' and
    (m.home_team_id = tm.team_id or m.away_team_id = tm.team_id) then m.id end) as matches_played,
  coalesce((select count(*) from public.match_goals g
    where g.player_id = p.id and g.match_id in (
      select id from public.matches where tournament_id = m.tournament_id and status = 'played'
    )), 0) as goals,
  coalesce((select count(*) from public.match_cards c
    where c.player_id = p.id and c.type = 'yellow' and c.match_id in (
      select id from public.matches where tournament_id = m.tournament_id and status = 'played'
    )), 0) as yellow_cards,
  coalesce((select count(*) from public.match_cards c
    where c.player_id = p.id and c.type = 'red' and c.match_id in (
      select id from public.matches where tournament_id = m.tournament_id and status = 'played'
    )), 0) as red_cards,
  coalesce((select count(*) from public.match_cards c
    where c.player_id = p.id and c.type = 'blue' and c.match_id in (
      select id from public.matches where tournament_id = m.tournament_id and status = 'played'
    )), 0) as blue_cards
from public.players p
left join public.team_memberships tm on tm.player_id = p.id
left join public.teams t on t.id = tm.team_id
left join public.matches m on m.tournament_id = t.tournament_id
group by p.id, m.tournament_id;

-- View: tabla de posiciones por grupo
create or replace view public.v_standings
with (security_invoker = on) as
select
  g.id as group_id,
  g.name as group_name,
  g.phase_id,
  t.id as team_id,
  t.name as team_name,
  t.short_name,
  t.color,
  count(m.id) filter (where m.status = 'played') as played,
  count(m.id) filter (where m.status = 'played' and (
    (m.home_team_id = t.id and m.home_score > m.away_score) or
    (m.away_team_id = t.id and m.away_score > m.home_score)
  )) as wins,
  count(m.id) filter (where m.status = 'played' and m.home_score = m.away_score) as draws,
  count(m.id) filter (where m.status = 'played' and (
    (m.home_team_id = t.id and m.home_score < m.away_score) or
    (m.away_team_id = t.id and m.away_score < m.home_score)
  )) as losses,
  coalesce(sum(case when m.status = 'played' and m.home_team_id = t.id then m.home_score
           when m.status = 'played' and m.away_team_id = t.id then m.away_score
           else 0 end), 0) as goals_for,
  coalesce(sum(case when m.status = 'played' and m.home_team_id = t.id then m.away_score
           when m.status = 'played' and m.away_team_id = t.id then m.home_score
           else 0 end), 0) as goals_against,
  (count(m.id) filter (where m.status = 'played' and (
    (m.home_team_id = t.id and m.home_score > m.away_score) or
    (m.away_team_id = t.id and m.away_score > m.home_score)
  )) * 3 +
   count(m.id) filter (where m.status = 'played' and m.home_score = m.away_score)
  ) as points
from public.groups g
join public.group_teams gt on gt.group_id = g.id
join public.teams t on t.id = gt.team_id
left join public.matches m on (m.home_team_id = t.id or m.away_team_id = t.id) and m.group_id = g.id
group by g.id, g.name, g.phase_id, t.id, t.name, t.short_name, t.color;

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,  -- público para que las fotos sean accesibles en la vista pública
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Política: cualquiera puede leer avatares (son públicos).
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Política: el usuario autenticado puede subir solo a su carpeta.
create policy "avatars: self upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política: el usuario autenticado puede reemplazar/borrar solo los propios.
create policy "avatars: self update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: self delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================
-- Para generar los types de TypeScript correspondientes, correr:
--   pnpm supabase gen types typescript --project-id <tu-project-id> > src/types/database.ts
-- =============================================================================
