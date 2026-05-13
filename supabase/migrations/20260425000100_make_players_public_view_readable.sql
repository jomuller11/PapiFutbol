-- Make the public player view readable by anonymous/public clients.
-- The view intentionally exposes only non-sensitive player fields.

create or replace view public.v_players_public as
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

comment on view public.v_players_public is
  'Public player fields only. Do not add DNI, phone, email, birth date, profile_id, or private references.';

grant select on public.v_players_public to anon, authenticated;
