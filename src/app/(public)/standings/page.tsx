import { createClient } from '@/lib/supabase/server';
import { BarChart3 } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';
import { StandingsClient } from './StandingsClient';

export const metadata = {
  title: 'Posiciones — Liga.9',
  description: 'Tabla de posiciones del torneo de fútbol 9.',
};

type StandingRow = {
  team_id: string;
  team_name: string;
  color: string;
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

  // Traer grupos
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('phases.tournament_id', (tournament as any).id) 
    .order('name');

  // Traer todos los partidos jugados con equipos
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      home_team_id, away_team_id,
      home_score, away_score, status
    `)
    .eq('tournament_id', (tournament as any).id)
    .eq('status', 'played');

  // Traer todos los equipos del torneo con su grupo
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id, name, color,
      group_teams(groups(name))
    `)
    .eq('tournament_id', (tournament as any).id)
    .order('name');

  if (!teams || teams.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Tabla de posiciones" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  // Extraer los nombres de los grupos para los tabs
  const groupNames = Array.from(new Set(
    (teams as any[]).map(t => t.group_teams?.[0]?.groups?.name).filter(Boolean)
  )).sort();
  const groupTabs = groupNames.map((name, i) => ({ id: String(i), name }));

  // Calcular tabla de posiciones
  const standing: Record<string, StandingRow> = {};

  // Inicializar todos los equipos con 0
  for (const t of (teams as any[])) {
    standing[t.id] = {
      team_id: t.id,
      team_name: t.name,
      color: t.color,
      group_name: t.group_teams?.[0]?.groups?.name || 'all',
      pj: 0, pg: 0, pe: 0, pp: 0,
      gf: 0, gc: 0, dg: 0, pts: 0,
    };
  }

  // Acumular resultados
  for (const m of (matches as any[]) ?? []) {
    const hs = m.home_score!;
    const as_ = m.away_score!;
    const hid = m.home_team_id;
    const aid = m.away_team_id;

    if (!standing[hid] || !standing[aid]) continue;

    // Home
    standing[hid].pj++;
    standing[hid].gf += hs;
    standing[hid].gc += as_;

    // Away
    standing[aid].pj++;
    standing[aid].gf += as_;
    standing[aid].gc += hs;

    if (hs > as_) {
      standing[hid].pg++;
      standing[hid].pts += 3;
      standing[aid].pp++;
    } else if (hs < as_) {
      standing[aid].pg++;
      standing[aid].pts += 3;
      standing[hid].pp++;
    } else {
      standing[hid].pe++;
      standing[hid].pts += 1;
      standing[aid].pe++;
      standing[aid].pts += 1;
    }
  }

  // Calcular diferencia de goles y ordenar
  const rows = Object.values(standing).map((r) => ({
    ...r,
    dg: r.gf - r.gc,
  })).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Tabla de posiciones" backHref="/" />
      <StandingsClient rows={rows} groups={groupTabs} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Posiciones</h1>
      <p className="text-sm font-medium">Las posiciones aparecerán una vez que empiece el torneo.</p>
    </div>
  );
}

