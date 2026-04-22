import { createClient } from '@/lib/supabase/server';
import { TeamsPageClient } from '@/components/admin/teams/TeamsPageClient';

export type TeamWithRoster = {
  id: string;
  name: string;
  short_name: string;
  color: string;
  logo_url: string | null;
  group_id: string | null;
  group_name: string | null;
  phase_name: string | null;
  roster_count: number;
  members: Array<{
    membership_id: string;
    player_id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
    position: string;
    score: number | null;
    avatar_url: string | null;
    jersey_number: number | null;
    is_captain: boolean;
  }>;
};

export type GroupOption = {
  id: string;
  name: string;
  phase_id: string;
  phase_name: string;
};

export type AvailablePlayer = {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  dni: string;
  position: string;
  foot: string;
  score: number | null;
  avatar_url: string | null;
};

export type TeamsPageData = {
  tournamentId: string | null;
  tournamentName: string | null;
  teams: TeamWithRoster[];
  groups: GroupOption[];
  availablePlayers: AvailablePlayer[];
};

export default async function AdminTeamsPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 p-10 text-center">
        <div className="font-mono text-[10px] text-slate-500 tracking-widest mb-2">
          SIN TORNEO
        </div>
        <h2 className="font-serif font-bold text-xl mb-2">
          No hay un torneo activo o en borrador
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Para crear equipos primero necesitás un torneo. Andá a la sección{' '}
          <span className="font-semibold">Torneo</span> para crear uno.
        </p>
      </div>
    );
  }

  // 1. Equipos con sus zonas, plantel y stats.
  const { data: teamsRaw, error: teamsError } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      short_name,
      color,
      logo_url,
      group_teams (
        group:groups!inner (
          id,
          name,
          phase:phases!inner (
            id,
            name,
            tournament_id
          )
        )
      ),
      team_memberships (
        id,
        jersey_number,
        is_captain,
        player:players!inner (
          id,
          first_name,
          last_name,
          nickname,
          position,
          score,
          avatar_url
        )
      )
    `)
    .eq('tournament_id', (tournament as any).id)
    .order('name');

  if (teamsError) {
    return (
      <div className="max-w-5xl mx-auto bg-red-50 border border-red-200 p-6 text-red-800">
        <p className="font-semibold">No pudimos cargar los equipos.</p>
        <p className="text-xs mt-1 font-mono">{teamsError.message}</p>
      </div>
    );
  }

  const teams: TeamWithRoster[] = (teamsRaw ?? []).map((t: any) => {
    // Tomamos la primera asignación de zona que pertenezca a este torneo
    const currentAssignment = (t.group_teams ?? []).find(
      (gt: any) => gt.group?.phase?.tournament_id === (tournament as any).id
    );
    const group = currentAssignment?.group;

    const members = (t.team_memberships ?? []).map((m: any) => ({
      membership_id: m.id,
      player_id: m.player.id,
      first_name: m.player.first_name,
      last_name: m.player.last_name,
      nickname: m.player.nickname,
      position: m.player.position,
      score: m.player.score,
      avatar_url: m.player.avatar_url,
      jersey_number: m.jersey_number,
      is_captain: m.is_captain,
    }));

    // Ordenar: capitán primero, después por número de camiseta, después por apellido
    members.sort((a: any, b: any) => {
      if (a.is_captain && !b.is_captain) return -1;
      if (!a.is_captain && b.is_captain) return 1;
      if (a.jersey_number != null && b.jersey_number != null) {
        return a.jersey_number - b.jersey_number;
      }
      if (a.jersey_number != null) return -1;
      if (b.jersey_number != null) return 1;
      return a.last_name.localeCompare(b.last_name);
    });

    return {
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      color: t.color,
      logo_url: t.logo_url,
      group_id: group?.id ?? null,
      group_name: group?.name ?? null,
      phase_name: group?.phase?.name ?? null,
      roster_count: members.length,
      members,
    };
  });

  // 2. Opciones de zonas (para selector) — solo de fases tipo grupos.
  const { data: groupsRaw } = await supabase
    .from('groups')
    .select(`
      id,
      name,
      phase:phases!inner (
        id,
        name,
        type,
        tournament_id
      )
    `)
    .eq('phase.tournament_id', (tournament as any).id)
    .eq('phase.type', 'groups')
    .order('name');

  const groups: GroupOption[] = (groupsRaw ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    phase_id: g.phase.id,
    phase_name: g.phase.name,
  }));

  // 3. Jugadores aprobados disponibles (que todavía no están en ningún equipo).
  const { data: approvedRegs } = await supabase
    .from('player_tournament_registrations')
    .select(`
      player:players!inner (
        id,
        first_name,
        last_name,
        nickname,
        dni,
        position,
        foot,
        score,
        avatar_url
      )
    `)
    .eq('tournament_id', (tournament as any).id)
    .eq('status', 'approved');

  const approvedPlayerIds = (approvedRegs ?? []).map((r: any) => r.player.id);

  const { data: currentMemberships } = await supabase
    .from('team_memberships')
    .select('player_id, team:teams!inner(tournament_id)')
    .in('player_id', approvedPlayerIds.length > 0 ? approvedPlayerIds : ['00000000-0000-0000-0000-000000000000']);

  const assignedIds = new Set(
    (currentMemberships ?? [])
      .filter((m: any) => m.team?.tournament_id === (tournament as any).id)
      .map((m: any) => m.player_id)
  );

  const availablePlayers: AvailablePlayer[] = (approvedRegs ?? [])
    .map((r: any) => r.player)
    .filter((p: any) => !assignedIds.has(p.id))
    .map((p: any) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      nickname: p.nickname,
      dni: p.dni,
      position: p.position,
      foot: p.foot,
      score: p.score,
      avatar_url: p.avatar_url,
    }));

  const data: TeamsPageData = {
    tournamentId: (tournament as any).id,
    tournamentName: (tournament as any).name,
    teams,
    groups,
    availablePlayers,
  };

  return <TeamsPageClient data={data} />;
}
