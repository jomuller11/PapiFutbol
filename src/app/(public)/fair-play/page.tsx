import { createClient } from '@/lib/supabase/server';
import { Shield } from 'lucide-react';

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
    return <EmptyState />;
  }

  // Tarjetas del torneo
  const { data: cards } = await supabase
    .from('match_cards')
    .select(`
      type, team_id,
      team:teams!match_cards_team_id_fkey(id, name, color),
      match:matches!match_cards_match_id_fkey(tournament_id)
    `)
    .eq('match.tournament_id', tournament.id);

  // Equipos del torneo
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, color')
    .eq('tournament_id', tournament.id)
    .order('name');

  if (!teams || teams.length === 0) {
    return <EmptyState />;
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

  for (const t of teams) {
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

  for (const c of cards ?? []) {
    if (!c.team_id || !fpMap[c.team_id]) continue;
    const type = c.type as 'yellow' | 'blue' | 'red';
    fpMap[c.team_id][type]++;
    fpMap[c.team_id].score += CARD_POINTS[type] ?? 0;
  }

  // Ordenar: mayor score (menos negativo) = mejor fair play
  const rows = Object.values(fpMap).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-slate-900">Fair Play</h1>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          {tournament.name} · {tournament.year}
        </span>
      </div>

      {/* Reglas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 p-3 text-center">
          <div className="text-2xl mb-1">🟨</div>
          <div className="text-xs font-semibold text-yellow-800">Amarilla</div>
          <div className="text-[10px] text-yellow-600 font-mono">−1 pto</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3 text-center">
          <div className="text-2xl mb-1">🟦</div>
          <div className="text-xs font-semibold text-blue-800">Azul</div>
          <div className="text-[10px] text-blue-600 font-mono">−1 pto · 5 min</div>
        </div>
        <div className="bg-red-50 border border-red-200 p-3 text-center">
          <div className="text-2xl mb-1">🟥</div>
          <div className="text-xs font-semibold text-red-800">Roja</div>
          <div className="text-[10px] text-red-600 font-mono">−3 ptos · expulsión</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-4 py-2.5 border-b border-slate-100 bg-slate-50 gap-4">
          <div className="w-6" />
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Equipo</div>
          <div className="w-8 text-center text-lg">🟨</div>
          <div className="w-8 text-center text-lg">🟦</div>
          <div className="w-8 text-center text-lg">🟥</div>
          <div className="w-12 text-center text-[10px] font-mono text-slate-400 uppercase">Ptos</div>
        </div>

        {rows.map((row, i) => (
          <div
            key={row.team_id}
            className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-4 py-3 border-b border-slate-50 last:border-0 gap-4 hover:bg-slate-50 transition-colors"
          >
            <div className="w-6 text-center font-mono text-xs text-slate-400 font-bold">{i + 1}</div>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: row.color }}
              />
              <span className="font-semibold text-sm text-slate-900 truncate">{row.team_name}</span>
            </div>
            <div className="w-8 text-center font-mono text-sm text-yellow-600 font-semibold">
              {row.yellow || '—'}
            </div>
            <div className="w-8 text-center font-mono text-sm text-blue-600 font-semibold">
              {row.blue || '—'}
            </div>
            <div className="w-8 text-center font-mono text-sm text-red-600 font-semibold">
              {row.red || '—'}
            </div>
            <div className={`w-12 text-center font-bold font-mono text-sm ${
              row.score === 0 ? 'text-emerald-600' :
              row.score > -3 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {row.score}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Mayor puntaje = mejor conducta. La tarjeta azul es exclusiva de este torneo.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500">
      <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-2xl font-bold text-slate-900 mb-2">Fair Play</h1>
      <p className="text-sm">Las estadísticas de fair play aparecerán con el torneo activo.</p>
    </div>
  );
}
