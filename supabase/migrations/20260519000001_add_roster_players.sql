-- =============================================================================
-- Agrega tabla roster_players para nóminas importadas del sitio web
-- Los jugadores del sitio oficial no tienen cuenta en la app todavía,
-- así que los guardamos solo con nombre y referencia al equipo.
-- =============================================================================

create table public.roster_players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  roster_position smallint,  -- orden en la lista (1-12)
  created_at timestamptz not null default now(),

  unique (team_id, full_name)
);

create index idx_roster_players_team on public.roster_players(team_id);

comment on table public.roster_players is 'Nómina importada del sitio oficial. Jugadores sin cuenta en la app.';

-- RLS
alter table public.roster_players enable row level security;

create policy "roster_players: public read"
  on public.roster_players for select
  using (true);

create policy "roster_players: staff write"
  on public.roster_players for all
  using (is_staff_or_admin())
  with check (is_staff_or_admin());
