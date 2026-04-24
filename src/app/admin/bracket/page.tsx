import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBracketPhases, getBracketsData } from '@/lib/actions/brackets';
import { BracketAdmin } from '@/components/admin/bracket/BracketAdmin';

type TeamOption = {
  id: string;
  name: string;
  short_name: string;
  color: string;
};

type StandingRow = {
  team_id: string;
  team_name: string;
  short_name: string;
  color: string;
  group_name: string | null;
  points: number | null;
  goals_for: number | null;
  goals_against: number | null;
};

function normalizeZoneName(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === '1' || normalized === '2' || normalized === '3') {
    return `zona ${normalized}`;
  }
  return normalized;
}

function buildCupPools(rows: StandingRow[]) {
  const grouped = new Map<string, StandingRow[]>();

  for (const row of rows) {
    const zoneName = normalizeZoneName(row.group_name);
    if (!grouped.has(zoneName)) grouped.set(zoneName, []);
    grouped.get(zoneName)!.push(row);
  }

  for (const [zoneName, zoneRows] of grouped.entries()) {
    zoneRows.sort((a, b) => {
      const aPoints = a.points ?? 0;
      const bPoints = b.points ?? 0;
      if (bPoints !== aPoints) return bPoints - aPoints;

      const aDiff = (a.goals_for ?? 0) - (a.goals_against ?? 0);
      const bDiff = (b.goals_for ?? 0) - (b.goals_against ?? 0);
      if (bDiff !== aDiff) return bDiff - aDiff;

      return (b.goals_for ?? 0) - (a.goals_for ?? 0);
    });
    grouped.set(zoneName, zoneRows);
  }

  const mapRow = (row: StandingRow): TeamOption => ({
    id: row.team_id,
    name: row.team_name,
    short_name: row.short_name,
    color: row.color,
  });

  const zona1 = grouped.get('zona 1') ?? [];
  const zona2 = grouped.get('zona 2') ?? [];
  const zona3 = grouped.get('zona 3') ?? [];

  return {
    oro: [...zona1.slice(0, 5), ...zona2.slice(0, 2), ...zona3.slice(0, 1)].map(mapRow),
    plata: [...zona1.slice(5, 7), ...zona2.slice(2, 6), ...zona3.slice(1, 3)].map(mapRow),
    bronce: [...zona1.slice(7, 8), ...zona2.slice(6, 8), ...zona3.slice(3, 8)].map(mapRow),
  };
}

export default async function AdminBracketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name')
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
            para gestionar las copas.
          </div>
        </div>
      </div>
    );
  }

  const tournamentId = (tournament as any).id;

  const [phases, allTeamsResponse] = await Promise.all([
    getBracketPhases(tournamentId),
    supabase.from('teams').select('id, name, short_name, color').eq('tournament_id', tournamentId).order('name'),
  ]);

  const allTeams = ((allTeamsResponse.data as any[]) ?? []) as TeamOption[];

  const groupPhases = await supabase
    .from('phases')
    .select('id, order, type')
    .eq('tournament_id', tournamentId)
    .eq('type', 'groups')
    .order('order', { ascending: true });

  const groupPhasesRows = ((groupPhases.data as any[]) ?? []) as Array<{ id: string; order: number; type: 'groups' }>;

  const phasesWithBrackets = await Promise.all(
    phases.map(async (phase: any) => {
      const brackets = await getBracketsData(phase.id);
      const previousGroupPhase = [...groupPhasesRows]
        .filter((groupPhase) => groupPhase.order < phase.order)
        .sort((a, b) => b.order - a.order)[0];

      let qualifiedByCup: Record<string, TeamOption[]> = {};
      if (previousGroupPhase && brackets.length === 3) {
        const standingsResponse = await supabase
          .from('v_standings')
          .select('team_id, team_name, short_name, color, group_name, points, goals_for, goals_against')
          .eq('phase_id', previousGroupPhase.id);

        const pools = buildCupPools(((standingsResponse.data as any[]) ?? []) as StandingRow[]);
        qualifiedByCup = {
          [brackets[0].id]: pools.oro,
          [brackets[1].id]: pools.plata,
          [brackets[2].id]: pools.bronce,
        };
      } else {
        qualifiedByCup = Object.fromEntries(brackets.map((bracket) => [bracket.id, allTeams]));
      }

      return {
        ...phase,
        brackets,
        qualifiedByCup,
      };
    })
  );

  return (
    <BracketAdmin
      tournamentName={(tournament as any).name}
      phases={phasesWithBrackets}
      allTeams={allTeams}
    />
  );
}
