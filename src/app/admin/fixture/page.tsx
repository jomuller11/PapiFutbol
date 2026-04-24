import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FixtureAdminClient } from './FixtureAdminClient';

export type MatchRow = {
  id: string;
  round_number: number;
  match_date: string;
  match_time: string;
  field_number: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
  home_team: { id: string; name: string; short_name: string; color: string } | null;
  away_team: { id: string; name: string; short_name: string; color: string } | null;
  observer_team: { name: string; short_name: string } | null;
  group: { id: string; name: string } | null;
  phase: { id: string; name: string } | null;
};

export type GroupWithTeams = {
  id: string;
  name: string;
  phase_id: string;
  phase_name: string;
  team_count: number;
  match_count: number;
};

export type FixturePageData = {
  tournamentId: string;
  tournamentName: string;
  groups: GroupWithTeams[];
  matches: MatchRow[];
};

export default async function AdminFixturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, fields_count, time_slots')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 p-8 text-center">
          <div className="font-semibold text-amber-900 text-lg mb-1">No hay torneo activo</div>
          <div className="text-sm text-amber-800">
            Creá un torneo desde{' '}
            <a href="/admin/tournament" className="underline font-medium">
              Configuración del torneo
            </a>{' '}
            para gestionar el fixture.
          </div>
        </div>
      </div>
    );
  }

  const tournamentId = (tournament as any).id as string;

  // Fetch matches with team and group info
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id, round_number, match_date, match_time, field_number, status, home_score, away_score, notes,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color),
      observer_team:teams!matches_observer_team_id_fkey(id, name, short_name),
      group:groups(id, name),
      phase:phases(id, name)
    `)
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true });

  const matches: MatchRow[] = ((rawMatches as any[]) ?? []).map((m: any) => ({
    id: m.id,
    round_number: m.round_number,
    match_date: m.match_date,
    match_time: m.match_time,
    field_number: m.field_number,
    status: m.status,
    home_score: m.home_score,
    away_score: m.away_score,
    notes: m.notes ?? null,
    home_team: m.home_team ?? null,
    away_team: m.away_team ?? null,
    observer_team: m.observer_team ?? null,
    group: m.group ?? null,
    phase: m.phase ?? null,
  }));

  // Fetch groups via phases (safe two-step to avoid cross-table filter issues)
  const { data: rawPhases } = await supabase
    .from('phases')
    .select('id, name')
    .eq('tournament_id', tournamentId);

  const phaseIds = ((rawPhases as any[]) ?? []).map((p: any) => p.id as string);
  const phaseNameMap: Record<string, string> = Object.fromEntries(
    ((rawPhases as any[]) ?? []).map((p: any) => [p.id, p.name as string])
  );

  const { data: rawGroups } = phaseIds.length > 0
    ? await supabase
        .from('groups')
        .select('id, name, phase_id, group_teams(team_id)')
        .in('phase_id', phaseIds)
        .order('name')
    : { data: [] };

  const groups: GroupWithTeams[] = ((rawGroups as any[]) ?? []).map((g: any) => {
    const matchCount = matches.filter(m => m.group?.id === g.id).length;
    return {
      id: g.id,
      name: g.name,
      phase_id: g.phase_id,
      phase_name: phaseNameMap[g.phase_id] ?? '',
      team_count: (g.group_teams ?? []).length,
      match_count: matchCount,
    };
  });

  const data: FixturePageData = {
    tournamentId,
    tournamentName: (tournament as any).name,
    groups,
    matches,
  };

  return <FixtureAdminClient data={data} />;
}
