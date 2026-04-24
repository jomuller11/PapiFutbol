import { createClient } from '@/lib/supabase/server';
import { BarChart3 } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';
import { StandingsClient } from './StandingsClient';

export const metadata = {
  title: 'Posiciones â€” Liga.9',
  description: 'Tabla de posiciones del torneo de fÃºtbol 9.',
};

type StandingRow = {
  team_id: string;
  team_name: string;
  color: string;
  secondary_color?: string | null;
  group_name: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

type GroupTable = {
  id: string;
  name: string;
  rows: StandingRow[];
};

type PhaseTable = {
  id: string;
  name: string;
  type: 'groups' | 'bracket';
  groups: GroupTable[];
};

function sortRows(rows: StandingRow[]) {
  return [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });
}

export default async function StandingsPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Tabla de posiciones" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  const tournamentId = (tournament as any).id;

  const [{ data: phases }, { data: standingsView }, { data: bracketMatches }] = await Promise.all([
    supabase.from('phases').select('id, name, type, order').eq('tournament_id', tournamentId).order('order', { ascending: true }),
    supabase
      .from('v_standings')
      .select('phase_id, team_id, team_name, color, group_name, played, wins, draws, losses, goals_for, goals_against, points')
      .in(
        'phase_id',
        (((await supabase.from('phases').select('id').eq('tournament_id', tournamentId).eq('type', 'groups')).data as any[]) ?? []).map((phase) => phase.id)
      ),
    supabase
      .from('matches')
      .select(`
        phase_id, bracket_id, home_team_id, away_team_id, home_score, away_score, status,
        bracket:brackets!matches_bracket_id_fkey(id, name),
        home_team:teams!matches_home_team_id_fkey(id, name, color, secondary_color),
        away_team:teams!matches_away_team_id_fkey(id, name, color, secondary_color)
      `)
      .eq('tournament_id', tournamentId)
      .not('bracket_id', 'is', null)
      .eq('status', 'played'),
  ]);

  const phaseRows = ((phases as any[]) ?? []) as Array<{ id: string; name: string; type: 'groups' | 'bracket'; order: number }>;
  const groupPhaseIds = phaseRows.filter((phase) => phase.type === 'groups').map((phase) => phase.id);

  const standingsByPhase = new Map<string, GroupTable[]>();
  for (const phaseId of groupPhaseIds) {
    const phaseRowsForTable = ((standingsView as any[]) ?? []).filter((row) => row.phase_id === phaseId);
    const byGroup = new Map<string, StandingRow[]>();

    for (const row of phaseRowsForTable) {
      const groupName = row.group_name ?? 'General';
      if (!byGroup.has(groupName)) byGroup.set(groupName, []);
      byGroup.get(groupName)!.push({
        team_id: row.team_id,
        team_name: row.team_name,
        color: row.color,
        secondary_color: null,
        group_name: groupName,
        pj: row.played ?? 0,
        pg: row.wins ?? 0,
        pe: row.draws ?? 0,
        pp: row.losses ?? 0,
        gf: row.goals_for ?? 0,
        gc: row.goals_against ?? 0,
        dg: (row.goals_for ?? 0) - (row.goals_against ?? 0),
        pts: row.points ?? 0,
      });
    }

    standingsByPhase.set(
      phaseId,
      Array.from(byGroup.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, rows]) => ({ id: name, name, rows: sortRows(rows) }))
    );
  }

  const bracketByPhase = new Map<string, GroupTable[]>();
  for (const match of (bracketMatches as any[]) ?? []) {
    const phaseId = match.phase_id as string;
    const bracketName = match.bracket?.name ?? 'Copa';
    if (!bracketByPhase.has(phaseId)) bracketByPhase.set(phaseId, []);

    let cupTable = bracketByPhase.get(phaseId)!.find((group) => group.name === bracketName);
    if (!cupTable) {
      cupTable = { id: match.bracket_id, name: bracketName, rows: [] };
      bracketByPhase.get(phaseId)!.push(cupTable);
    }

    const ensureRow = (team: any) => {
      let row = cupTable!.rows.find((item) => item.team_id === team.id);
      if (!row) {
        row = {
          team_id: team.id,
          team_name: team.name,
          color: team.color,
          secondary_color: team.secondary_color ?? null,
          group_name: bracketName,
          pj: 0,
          pg: 0,
          pe: 0,
          pp: 0,
          gf: 0,
          gc: 0,
          dg: 0,
          pts: 0,
        };
        cupTable!.rows.push(row);
      }
      return row;
    };

    const home = ensureRow(match.home_team);
    const away = ensureRow(match.away_team);
    const hs = match.home_score ?? 0;
    const as = match.away_score ?? 0;

    home.pj += 1;
    away.pj += 1;
    home.gf += hs;
    home.gc += as;
    away.gf += as;
    away.gc += hs;

    if (hs > as) {
      home.pg += 1;
      home.pts += 3;
      away.pp += 1;
    } else if (as > hs) {
      away.pg += 1;
      away.pts += 3;
      home.pp += 1;
    } else {
      home.pe += 1;
      away.pe += 1;
      home.pts += 1;
      away.pts += 1;
    }
  }

  for (const tables of bracketByPhase.values()) {
    for (const table of tables) {
      table.rows = sortRows(
        table.rows.map((row) => ({
          ...row,
          dg: row.gf - row.gc,
        }))
      );
    }
  }

  const phaseTables: PhaseTable[] = phaseRows
    .map((phase) => ({
      id: phase.id,
      name: phase.name,
      type: phase.type,
      groups: phase.type === 'groups' ? standingsByPhase.get(phase.id) ?? [] : bracketByPhase.get(phase.id) ?? [],
    }))
    .filter((phase) => phase.groups.length > 0);

  if (phaseTables.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Tabla de posiciones" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Tabla de posiciones" backHref="/" />

      <div className="hidden md:block bg-blue-900 px-8 py-8 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-20" />
        <div className="relative max-w-6xl mx-auto">
          <div className="font-mono text-[10px] text-blue-300 uppercase tracking-widest mb-1">CLASIFICACIÃ“N Â· {(tournament as any).year}</div>
          <div className="font-display text-4xl text-white">Tabla de posiciones</div>
        </div>
      </div>

      <StandingsClient phases={phaseTables} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Posiciones</h1>
      <p className="text-sm font-medium">Las posiciones aparecerÃ¡n una vez que empiece el torneo.</p>
    </div>
  );
}
