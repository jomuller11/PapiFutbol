import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { MobileHeader } from '@/components/public/MobileHeader';
import { MatchDetailClient } from './MatchDetailClient';
import { formatDisplayScore } from '@/lib/utils/match-notes';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('matches')
    .select(`
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name)
    `)
    .eq('id', id)
    .single();

  return {
    title: data
      ? `${((data as any).home_team as any)?.name} vs ${((data as any).away_team as any)?.name} — Liga.9`
      : 'Partido — Liga.9',
  };
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color),
      observer_team:teams!matches_observer_team_id_fkey(id, name)
    `)
    .eq('id', id)
    .single();

  if (!match) notFound();

  // Goles del partido
  const { data: goals } = await supabase
    .from('match_goals')
    .select(`
      id, minute, is_own_goal, team_id,
      player:players!match_goals_player_id_fkey(first_name, last_name, nickname)
    `)
    .eq('match_id', id)
    .order('minute', { ascending: true });

  // Tarjetas del partido
  const { data: cards } = await supabase
    .from('match_cards')
    .select(`
      id, minute, type, team_id,
      player:players!match_cards_player_id_fkey(first_name, last_name, nickname)
    `)
    .eq('match_id', id)
    .order('minute', { ascending: true });

  const isPlayed = (match as any).status === 'played';
  const ht = (match as any).home_team as any;
  const at = (match as any).away_team as any;

  return (
    <div className="bg-slate-50 min-h-screen md:max-w-3xl md:mx-auto">
      <MobileHeader title="Detalle del Partido" backHref="/fixture" />

      {/* Hero SCOREBOARD */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative px-4 py-8">
          
          {/* Status badge */}
          <div className="flex justify-center mb-6">
            {isPlayed ? (
              <div className="bg-white/10 backdrop-blur px-3 py-1 text-[10px] font-mono tracking-widest uppercase border border-white/20 text-emerald-400 font-bold">
                FINALIZADO
              </div>
            ) : (match as any).status === 'cancelled' ? (
              <div className="bg-red-500/20 backdrop-blur px-3 py-1 text-[10px] font-mono tracking-widest uppercase border border-red-500/50 text-red-400 font-bold">
                SUSPENDIDO
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur px-3 py-1 text-[10px] font-mono tracking-widest uppercase border border-white/20 text-blue-200">
                PROGRAMADO
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
            {/* Local */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white mb-3 flex items-center justify-center relative shadow-lg">
                <div className="absolute inset-1 rounded-full" style={{ background: ht?.color || '#3b82f6' }} />
              </div>
              <div className="font-display text-xl text-center leading-tight truncate w-full">{ht?.short_name || ht?.name?.substring(0,3).toUpperCase()}</div>
              <div className="text-[10px] text-blue-200 mt-1 uppercase tracking-wider">{ht?.name}</div>
            </div>

            {/* Score */}
            <div className="px-4 flex flex-col items-center justify-center">
              {isPlayed ? (
                <div className="font-display text-6xl leading-none flex items-center gap-2 text-white">
                  <span>{formatDisplayScore((match as any).home_score, (match as any).notes, 'home')}</span>
                  <span className="text-blue-500/50 mb-2">-</span>
                  <span>{formatDisplayScore((match as any).away_score, (match as any).notes, 'away')}</span>
                </div>
              ) : (
                <div className="font-display text-3xl text-orange-400">
                  {(match as any).match_time}
                </div>
              )}
            </div>

            {/* Visitante */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white mb-3 flex items-center justify-center relative shadow-lg">
                <div className="absolute inset-1 rounded-full" style={{ background: at?.color || '#94a3b8' }} />
              </div>
              <div className="font-display text-xl text-center leading-tight truncate w-full">{at?.short_name || at?.name?.substring(0,3).toUpperCase()}</div>
              <div className="text-[10px] text-blue-200 mt-1 uppercase tracking-wider">{at?.name}</div>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="bg-black/20 backdrop-blur-md border-t border-white/10 py-2 px-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-blue-200">
          <div>Fecha {(match as any).round_number}</div>
          <div>Cancha {(match as any).field_number}</div>
          <div>{new Date((match as any).match_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</div>
        </div>
      </div>

      <MatchDetailClient match={match as any} goals={goals ?? []} cards={cards ?? []} />
    </div>
  );
}
