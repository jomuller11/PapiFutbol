import { createClient } from '@/lib/supabase/server';
import { Shield } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';

export const metadata = {
  title: 'Fair Play — Liga.9',
  description: 'Tabla de fair play del torneo.',
};

// Reglas de tarjetas (del CONTEXT.md):
// Amarilla: 1 punto negativo, acumula suspensión
// Azul: 1 punto negativo, 5 minutos fuera, NO acumula suspensión
// Roja: expulsión, suspensión automática
const CARD_POINTS: Record<string, number> = {
  yellow: -1,
  blue: -1,
  red: -3,
};

export default async function FairPlayPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Fair Play" backHref="/more" />
        <EmptyState />
      </div>
    );
  }

  // Tarjetas del torneo
  const { data: cards } = await supabase
    .from('match_cards')
    .select(`
      type, team_id,
      team:teams!match_cards_team_id_fkey(id, name, color),
      match:matches!match_cards_match_id_fkey(tournament_id)
    `)
    .eq('match.tournament_id', (tournament as any).id);

  // Equipos del torneo
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, color')
    .eq('tournament_id', (tournament as any).id)
    .order('name');

  if (!teams || teams.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Fair Play" backHref="/more" />
        <EmptyState />
      </div>
    );
  }

  // Calcular fair play por equipo
  const fpMap: Record<string, {
    team_id: string;
    team_name: string;
    color: string;
    yellow: number;
    blue: number;
    red: number;
    score: number;
  }> = {};

  for (const t of (teams as any[])) {
    fpMap[t.id] = {
      team_id: t.id,
      team_name: t.name,
      color: t.color,
      yellow: 0,
      blue: 0,
      red: 0,
      score: 0,
    };
  }

  for (const c of (cards as any[]) ?? []) {
    if (!c.team_id || !fpMap[c.team_id]) continue;
    const type = c.type as 'yellow' | 'blue' | 'red';
    fpMap[c.team_id][type]++;
    fpMap[c.team_id].score += CARD_POINTS[type] ?? 0;
  }

  // Ordenar: mayor score (menos negativo) = mejor fair play
  const rows = Object.values(fpMap).sort((a, b) => b.score - a.score);

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Fair Play" backHref="/more" />
      <div className="md:max-w-4xl md:mx-auto">

      {/* Hero Stats */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 noise opacity-20" />
        <div className="relative text-center">
          <Shield className="w-10 h-10 mx-auto text-emerald-300 mb-2 opacity-80" />
          <div className="font-serif text-2xl font-bold">CONDUCTA DEPORTIVA</div>
          <div className="text-[10px] font-mono text-emerald-200 mt-1 uppercase tracking-widest">{(tournament as any).name}</div>
        </div>
      </div>

      <div className="p-3">
        {/* Reglas */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white border border-slate-200 p-2 text-center shadow-sm">
            <div className="w-4 h-6 bg-yellow-400 mx-auto rounded-sm mb-1.5 shadow-sm" />
            <div className="text-[10px] font-semibold text-slate-800">Amarilla</div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">−1 PTO</div>
          </div>
          <div className="bg-white border border-slate-200 p-2 text-center shadow-sm">
            <div className="w-4 h-6 bg-blue-500 mx-auto rounded-sm mb-1.5 shadow-sm" />
            <div className="text-[10px] font-semibold text-slate-800">Azul</div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">−1 PTO</div>
          </div>
          <div className="bg-white border border-slate-200 p-2 text-center shadow-sm">
            <div className="w-4 h-6 bg-red-500 mx-auto rounded-sm mb-1.5 shadow-sm" />
            <div className="text-[10px] font-semibold text-slate-800">Roja</div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">−3 PTOS</div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-3 py-2 border-b border-slate-100 bg-slate-50 gap-3">
            <div className="w-5 text-[9px] font-mono text-slate-400 text-center">#</div>
            <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Equipo</div>
            <div className="w-6 text-center text-xs">🟨</div>
            <div className="w-6 text-center text-xs">🟦</div>
            <div className="w-6 text-center text-xs">🟥</div>
            <div className="w-8 text-center text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Ptos</div>
          </div>

          <div className="divide-y divide-slate-50">
            {rows.map((row, i) => (
              <div key={row.team_id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-3 py-3 gap-3 hover:bg-slate-50 transition-colors">
                <div className="w-5 text-center font-mono text-xs text-slate-400 font-bold">{i + 1}</div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="font-semibold text-xs text-slate-900 truncate">{row.team_name}</span>
                </div>
                <div className="w-6 text-center font-mono text-xs text-slate-500">{row.yellow || '—'}</div>
                <div className="w-6 text-center font-mono text-xs text-slate-500">{row.blue || '—'}</div>
                <div className="w-6 text-center font-mono text-xs text-slate-500">{row.red || '—'}</div>
                <div className={`w-8 text-center font-bold font-mono text-xs ${
                  row.score === 0 ? 'text-emerald-600' :
                  row.score > -3 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {row.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center px-4">
          <p className="text-[10px] text-slate-400 font-mono">
            Mayor puntaje = mejor conducta. La tarjeta azul es exclusiva del torneo.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Fair Play</h1>
      <p className="text-sm font-medium">Las estadísticas de fair play aparecerán con el torneo activo.</p>
    </div>
  );
}

