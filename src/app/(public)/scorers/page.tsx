import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Zap } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';
import { TeamColorSwatch } from '@/components/shared/TeamColorSwatch';
import { PlayerAvatar } from '@/components/shared/PlayerAvatar';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Goleadores — Liga.9',
  description: 'Tabla de goleadores del torneo.',
};

export default async function ScorersPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Goleadores" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  // Goles por jugador (sin goles en contra propios)
  const { data: goals } = await adminSupabase
    .from('match_goals')
    .select(`
      player_id, is_own_goal,
      player:players!match_goals_player_id_fkey(
        id, first_name, last_name, nickname, position, avatar_url,
        profile:profiles!players_profile_id_fkey(email)
      ),
      team:teams!match_goals_team_id_fkey(name, color, secondary_color),
      match:matches!match_goals_match_id_fkey!inner(tournament_id)
    `)
    .eq('match.tournament_id', (tournament as any).id)
    .eq('is_own_goal', false);

  // Agrupar por jugador
  const scorerMap: Record<string, {
    player: any;
    team: any;
    goals: number;
  }> = {};

  for (const g of (goals as any[]) ?? []) {
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
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Goleadores" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  const podium = [scorers[1], scorers[0], scorers[2]].filter(Boolean); // 2nd, 1st, 3rd

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Goleadores" backHref="/" />
      <div className="md:max-w-4xl md:mx-auto">

      {/* Top 3 podio */}
      <div className="bg-gradient-to-b from-blue-900 to-blue-950 text-white px-4 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative">
          <div className="font-mono text-[10px] text-orange-400 tracking-widest font-bold mb-1 text-center uppercase">PIE DE ORO · {(tournament as any).year}</div>
          <div className="font-display text-2xl text-center mb-5 tracking-wide">TABLA DE ARTILLEROS</div>

          <div className="grid grid-cols-3 gap-2 items-end">
            {podium.map((s, idx) => {
              // idx 0 -> 2nd, idx 1 -> 1st, idx 2 -> 3rd
              const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const heights = ['h-16', 'h-20', 'h-12'];
              const heightClass = idx === 0 ? heights[0] : idx === 1 ? heights[1] : heights[2];
              
              const name = s.player?.nickname || `${s.player?.first_name} ${s.player?.last_name}`;
              return (
                <Link key={s.player?.id ?? pos} href={s.player?.id ? `/player/${s.player.id}` : '#'} className="flex flex-col items-center">
                  <PlayerAvatar
                    firstName={s.player?.first_name}
                    lastName={s.player?.last_name}
                    avatarUrl={s.player?.avatar_url}
                    className="w-14 h-14 rounded-full mb-2 shadow-sm"
                    textClassName="bg-white text-blue-900 text-lg font-display"
                  />
                  <div className="text-xs font-semibold text-center leading-tight truncate w-full px-1">{name}</div>
                  <div className="text-[10px] text-blue-200 mb-2 truncate w-full text-center">{s.team?.name}</div>
                  <div className={`w-full ${heightClass} flex flex-col items-center justify-center shadow-md ${
                    pos === 1 ? 'bg-orange-500' : pos === 2 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700'
                  }`}>
                    <div className="font-display text-2xl">{pos}°</div>
                    <div className="font-mono text-[10px] font-bold">{s.goals} GOLES</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista completa */}
      <div className="p-3 space-y-2">
        {scorers.map((s, i) => {
          const name = s.player?.first_name ? `${s.player.first_name} ${s.player.last_name}` : 'Jugador';
          return (
            <Link key={s.player?.id ?? i} href={s.player?.id ? `/player/${s.player.id}` : '#'} className="w-full bg-white border border-slate-200 p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors shadow-sm">
              <div className={`w-9 h-9 font-display text-lg flex items-center justify-center flex-shrink-0 ${
                i === 0 ? 'bg-orange-500 text-white shadow-sm' : i === 1 ? 'bg-slate-300 shadow-sm' : i === 2 ? 'bg-amber-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}>
                {i + 1}
              </div>
              <PlayerAvatar
                firstName={s.player?.first_name}
                lastName={s.player?.last_name}
                avatarUrl={s.player?.avatar_url}
                className="w-10 h-10 rounded-full"
                textClassName="bg-blue-100 text-blue-900 text-xs font-semibold"
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold text-sm truncate text-slate-900">
                  {name} {s.player?.nickname && <span className="text-slate-400 text-xs font-medium">"{s.player.nickname}"</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <TeamColorSwatch team={s.team} className="w-2 h-2 rounded-sm" />
                  <span className="truncate">{s.team?.name}</span>
                  {s.player?.position && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono font-medium">{s.player.position}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display text-2xl text-blue-900 leading-none">{s.goals}</div>
                <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Goles</div>
              </div>
            </Link>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Goleadores</h1>
      <p className="text-sm font-medium">Los goleadores aparecerán cuando se registren goles.</p>
    </div>
  );
}
