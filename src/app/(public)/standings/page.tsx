import { createClient } from '@/lib/supabase/server';
import { BarChart3, TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Posiciones — Liga.9',
  description: 'Tabla de posiciones del torneo de fútbol 9.',
};

type StandingRow = {
  team_id: string;
  team_name: string;
  color: string;
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
    return <EmptyState />;
  }

  // Traer todos los partidos jugados con equipos
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      home_team_id, away_team_id,
      home_score, away_score, status,
      home_team:teams!matches_home_team_id_fkey(id, name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, color)
    `)
    .eq('tournament_id', tournament.id)
    .eq('status', 'played');

  // Traer todos los equipos del torneo para mostrar incluso los que no jugaron
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, color')
    .eq('tournament_id', tournament.id)
    .order('name');

  if (!teams || teams.length === 0) {
    return <EmptyState />;
  }

  // Calcular tabla de posiciones
  const standing: Record<string, StandingRow> = {};

  // Inicializar todos los equipos con 0
  for (const t of teams) {
    standing[t.id] = {
      team_id: t.id,
      team_name: t.name,
      color: t.color,
      pj: 0, pg: 0, pe: 0, pp: 0,
      gf: 0, gc: 0, dg: 0, pts: 0,
    };
  }

  // Acumular resultados
  for (const m of matches ?? []) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-slate-900">Posiciones</h1>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          {tournament.name} · {tournament.year}
        </span>
      </div>

      <div className="bg-white border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_repeat(6,_auto)] items-center px-4 py-2.5 border-b border-slate-100 bg-slate-50">
          <div className="w-7 text-[10px] font-mono text-slate-400">#</div>
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Equipo</div>
          {['PJ', 'PG', 'PE', 'PP', 'DG', 'PTS'].map((h) => (
            <div key={h} className="w-9 text-center text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div
            key={row.team_id}
            className={`grid grid-cols-[auto_1fr_repeat(6,_auto)] items-center px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${
              i < 3 ? 'border-l-2' : ''
            }`}
            style={i < 3 ? { borderLeftColor: row.color } : {}}
          >
            <div className="w-7 font-mono text-sm text-slate-400 font-bold">{i + 1}</div>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: row.color }}
              />
              <span className="font-semibold text-sm text-slate-900 truncate">{row.team_name}</span>
            </div>
            <div className="w-9 text-center text-sm font-mono text-slate-500">{row.pj}</div>
            <div className="w-9 text-center text-sm font-mono text-slate-500">{row.pg}</div>
            <div className="w-9 text-center text-sm font-mono text-slate-500">{row.pe}</div>
            <div className="w-9 text-center text-sm font-mono text-slate-500">{row.pp}</div>
            <div className={`w-9 text-center text-sm font-mono font-semibold ${
              row.dg > 0 ? 'text-emerald-600' : row.dg < 0 ? 'text-red-500' : 'text-slate-400'
            }`}>
              {row.dg > 0 ? '+' : ''}{row.dg}
            </div>
            <div className="w-9 text-center text-sm font-bold font-mono text-blue-900">{row.pts}</div>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
        <span>PJ = Partidos jugados</span>
        <span>DG = Diferencia de goles</span>
        <span>PTS = Puntos</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-2xl font-bold text-slate-900 mb-2">Posiciones</h1>
      <p className="text-sm">Las posiciones aparecerán una vez que empiece el torneo.</p>
    </div>
  );
}
