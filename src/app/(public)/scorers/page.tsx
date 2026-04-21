import { createClient } from '@/lib/supabase/server';
import { Zap } from 'lucide-react';

export const metadata = {
  title: 'Goleadores — Liga.9',
  description: 'Tabla de goleadores del torneo.',
};

export default async function ScorersPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return <EmptyState />;
  }

  // Goles por jugador (sin goles en contra propios)
  const { data: goals } = await supabase
    .from('match_goals')
    .select(`
      player_id, is_own_goal,
      player:players!match_goals_player_id_fkey(
        id, first_name, last_name, nickname, position, avatar_url,
        profile:profiles!players_profile_id_fkey(email)
      ),
      team:teams!match_goals_team_id_fkey(name, color),
      match:matches!match_goals_match_id_fkey(tournament_id)
    `)
    .eq('match.tournament_id', tournament.id)
    .eq('is_own_goal', false);

  // Agrupar por jugador
  const scorerMap: Record<string, {
    player: any;
    team: any;
    goals: number;
  }> = {};

  for (const g of goals ?? []) {
    if (!g.player_id) continue;
    if (!scorerMap[g.player_id]) {
      scorerMap[g.player_id] = {
        player: g.player,
        team: g.team,
        goals: 0,
      };
    }
    scorerMap[g.player_id].goals++;
  }

  const scorers = Object.values(scorerMap)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 30); // top 30

  if (scorers.length === 0) {
    return <EmptyState />;
  }

  const top = scorers[0].goals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-slate-900">Goleadores</h1>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          {tournament.name} · {tournament.year}
        </span>
      </div>

      <div className="bg-white border border-slate-200 overflow-hidden">
        {scorers.map((s, i) => {
          const name = s.player?.nickname
            ? `${s.player.nickname}`
            : `${s.player?.first_name} ${s.player?.last_name}`;
          const pct = (s.goals / top) * 100;
          const isLeader = i === 0;

          return (
            <div
              key={s.player?.id ?? i}
              className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
            >
              {/* Posición */}
              <div className={`w-7 text-center font-mono font-bold text-sm flex-shrink-0 ${
                i === 0 ? 'text-orange-500' : i < 3 ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {i + 1}
              </div>

              {/* Avatar placeholder */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: s.team?.color ?? '#94a3b8' }}
              >
                {(s.player?.first_name?.[0] ?? '') + (s.player?.last_name?.[0] ?? '')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm truncate ${isLeader ? 'text-slate-900' : 'text-slate-800'}`}>
                  {name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.team?.color ?? '#94a3b8' }}
                  />
                  <span className="text-xs text-slate-400 truncate">{s.team?.name}</span>
                  <span className="text-[10px] font-mono text-slate-300">{s.player?.position}</span>
                </div>
                {/* Barra de progreso */}
                <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isLeader ? '#f97316' : '#3b82f6',
                    }}
                  />
                </div>
              </div>

              {/* Goles */}
              <div className={`flex items-center gap-1 flex-shrink-0 ${isLeader ? 'text-orange-500' : 'text-slate-700'}`}>
                <Zap className={`w-4 h-4 ${isLeader ? 'text-orange-400' : 'text-slate-300'}`} />
                <span className="font-bold text-lg font-serif">{s.goals}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500">
      <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-2xl font-bold text-slate-900 mb-2">Goleadores</h1>
      <p className="text-sm">Los goleadores aparecerán cuando se registren goles.</p>
    </div>
  );
}
