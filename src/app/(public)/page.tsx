import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Trophy, CalendarDays, BarChart3, Shield, Zap,
  ChevronRight, Clock, Hash, Users
} from 'lucide-react';
import { MatchRow } from '@/components/public/MatchRow';

export const metadata = {
  title: 'Liga.9 — Torneo de Fútbol 9',
  description: 'Seguí todos los partidos, posiciones y estadísticas del torneo de fútbol 9.',
};

export default async function PublicHomePage() {
  const supabase = await createClient();

  // Torneo activo
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year, fields_count, players_per_team, max_teams')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <Trophy className="w-16 h-16 text-slate-300 mb-4" strokeWidth={1.5} />
        <h1 className="font-serif text-3xl font-bold mb-2 text-slate-800">
          Liga<span className="text-orange-500">.</span>9
        </h1>
        <p className="text-slate-500 text-sm">Pronto habrá un torneo activo.</p>
      </div>
    );
  }

  // Últimos resultados (status played)
  const { data: recentMatches } = await supabase
    .from('matches')
    .select(`
      id, match_date, match_time, field_number, round_number,
      home_score, away_score, status, group_id,
      home_team:teams!matches_home_team_id_fkey(name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(name, short_name, color),
      group:groups!matches_group_id_fkey(name)
    `)
    .eq('tournament_id', (tournament as any).id)
    .eq('status', 'played')
    .order('match_date', { ascending: false })
    .order('match_time', { ascending: false })
    .limit(3);

  // Próximos partidos (status scheduled)
  const today = new Date().toISOString().split('T')[0];
  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select(`
      id, match_date, match_time, field_number, round_number, status, group_id,
      home_team:teams!matches_home_team_id_fkey(name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(name, short_name, color),
      group:groups!matches_group_id_fkey(name)
    `)
    .eq('tournament_id', (tournament as any).id)
    .eq('status', 'scheduled')
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
    .limit(4);

  // Top 3 goleadores
  const { data: goals } = await supabase
    .from('match_goals')
    .select(`player_id, match:matches!match_goals_match_id_fkey(tournament_id)`)
    .eq('match.tournament_id', (tournament as any).id)
    .eq('is_own_goal', false);

  const goalCount: Record<string, number> = {};
  for (const g of (goals as any[]) ?? []) {
    if (g.player_id) goalCount[g.player_id] = (goalCount[g.player_id] ?? 0) + 1;
  }
  const topScorerIds = Object.entries(goalCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, cnt]) => ({ id, cnt }));

  let topScorers: any[] = [];
  if (topScorerIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, nickname, position, team_memberships(team:teams(name, color))')
      .in('id', topScorerIds.map(s => s.id));

    topScorers = topScorerIds.map(({ id, cnt }) => ({
      ...(players?.find((p: any) => p.id === id) as any),
      goals: cnt,
    }));
  }

  // Feed dinámico: últimos partidos jugados como novedades
  type FeedItem = { id: string | number; icon: React.ElementType; iconBg: string; title: string; body: string; time: string; href: string; featured: boolean };
  const feedItems: FeedItem[] = (recentMatches as any[] ?? []).slice(0, 2).map((m: any) => {
    const home = m.home_team;
    const away = m.away_team;
    const homeWon = m.home_score > m.away_score;
    const awayWon = m.away_score > m.home_score;
    const winnerName = homeWon ? home?.name : awayWon ? away?.name : null;
    const winnerColor = (homeWon ? home?.color : awayWon ? away?.color : null) ?? '#94a3b8';
    const dateStr = m.match_date
      ? new Date(m.match_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).toUpperCase()
      : '';
    return {
      id: m.id,
      icon: winnerName ? Trophy : BarChart3,
      iconBg: winnerColor,
      title: winnerName ? `Gana ${winnerName}` : 'Empate',
      body: `${home?.name ?? '?'} ${m.home_score} — ${m.away_score} ${away?.name ?? '?'}`,
      time: dateStr ? `${dateStr} · Fecha ${m.round_number}` : `Fecha ${m.round_number}`,
      href: `/match/${m.id}`,
      featured: false,
    };
  });
  if (feedItems.length === 0) {
    feedItems.push({ id: 'info', icon: Trophy, iconBg: '#1e3a8a', title: 'Torneo en curso', body: 'Seguí los partidos y resultados del fin de semana.', time: 'Reciente', href: '/fixture', featured: true });
  }

  return (
    <div className="pb-8 bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white p-5 pb-8 overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-40" />
        <div className="absolute inset-0 noise opacity-50" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white flex items-center justify-center relative">
                <Trophy className="w-4 h-4 text-blue-900" strokeWidth={2.5} />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500" />
              </div>
              <div className="font-serif text-lg font-black leading-none">Liga<span className="text-orange-400">.</span>9</div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 backdrop-blur text-[9px] font-mono tracking-widest">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              EN JUEGO
            </div>
          </div>

          <div className="font-mono text-[10px] text-orange-400 tracking-[0.2em] font-bold mb-1 uppercase">EDICIÓN {(tournament as any).year}</div>
          <h1 className="font-display text-[44px] leading-[0.9] mb-3 uppercase tracking-wide">
            {(tournament as any).name.split(' ')[0]}<br />
            {(tournament as any).name.split(' ').slice(1).join(' ')}
          </h1>

          <div className="flex items-center gap-3 text-xs text-blue-100 font-medium">
            <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {(tournament as any).max_teams} eq.</div>
            <div className="w-0.5 h-3 bg-white/20" />
            <div className="flex items-center gap-1"><Hash className="w-3 h-3" /> F11</div>
            <div className="w-0.5 h-3 bg-white/20" />
            <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> SÁB.</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 px-4 -mt-4 relative z-10 mb-6">
        <Link href="/standings" className="bg-blue-900 text-white p-3 flex flex-col items-start gap-1 active:scale-95 transition-transform shadow-md border border-blue-800">
          <BarChart3 className="w-4 h-4 text-blue-300" />
          <span className="font-semibold text-xs tracking-wide">Tabla</span>
        </Link>
        <Link href="/scorers" className="bg-orange-500 text-white p-3 flex flex-col items-start gap-1 active:scale-95 transition-transform shadow-md border border-orange-400">
          <Zap className="w-4 h-4 text-orange-200" />
          <span className="font-semibold text-xs tracking-wide">Goleadores</span>
        </Link>
        <Link href="/fair-play" className="bg-emerald-600 text-white p-3 flex flex-col items-start gap-1 active:scale-95 transition-transform shadow-md border border-emerald-500">
          <Shield className="w-4 h-4 text-emerald-200" />
          <span className="font-semibold text-xs tracking-wide">Fair Play</span>
        </Link>
      </div>

      {/* Próxima fecha */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <>
          <SectionTitle title="Próxima fecha" sub={`Fecha ${(upcomingMatches as any[])[0].round_number}`} actionLabel="Ver fixture" onAction="/fixture" />
          <div className="px-4 mb-6">
            <div className="flex gap-3 overflow-x-auto hide-scroll -mx-4 px-4 pb-2 pt-1">
              {(upcomingMatches as any[]).map(m => (
                <MatchCardHorizontal key={m.id} match={m} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Feed (Novedades) */}
      <SectionTitle title="Novedades" sub="Lo último del torneo" />
      <div className="px-4 space-y-3 mb-6">
        {feedItems.map(item => <FeedCard key={item.id} item={item} />)}
      </div>

      {/* Resultados recientes */}
      {recentMatches && recentMatches.length > 0 && (
        <>
          <SectionTitle title="Últimos resultados" sub={`Fecha ${(recentMatches as any[])[0].round_number}`} actionLabel="Ver todos" onAction="/fixture" />
          <div className="px-4 space-y-2 mb-6">
            {(recentMatches as any[]).map(m => <MatchRow key={m.id} match={m} showScore />)}
          </div>
        </>
      )}

      {/* Top goleadores resumen */}
      {topScorers.length > 0 && (
        <>
          <SectionTitle title="Artilleros" actionLabel="Ranking" onAction="/scorers" />
          <div className="px-4 mb-6">
            <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
              {topScorers.map((s, i) => {
                const teamData = s.team_memberships?.[0]?.team;
                const name = s.nickname ?? `${s.first_name} ${s.last_name}`;
                return (
                  <Link key={s.id} href="/scorers" className="p-3 flex items-center gap-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 font-display text-base flex items-center justify-center text-white ${
                      i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate text-slate-800">{name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-sm" style={{ background: teamData?.color ?? '#94a3b8' }} />
                        <span className="truncate">{teamData?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl text-blue-900 leading-none">{s.goals}</div>
                      <div className="font-mono text-[9px] text-slate-400 mt-0.5 tracking-wider">GOLES</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

function SectionTitle({ title, sub, actionLabel, onAction }: { title: string, sub?: string, actionLabel?: string, onAction?: string }) {
  return (
    <div className="px-4 mb-3 flex items-end justify-between">
      <div>
        <div className="font-display text-2xl leading-none text-slate-900 tracking-wide">{title}</div>
        {sub && <div className="text-[11px] text-slate-500 mt-1 font-mono tracking-wide uppercase">{sub}</div>}
      </div>
      {actionLabel && onAction && (
        <Link href={onAction} className="text-xs text-blue-700 font-bold flex items-center gap-0.5 tracking-wide">
          {actionLabel} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function MatchCardHorizontal({ match }: { match: any }) {
  const ht = match.home_team;
  const at = match.away_team;
  return (
    <Link href={`/match/${match.id}`} className="flex-shrink-0 w-52 bg-white border border-slate-200 p-3 text-left hover:bg-slate-50 transition-colors shadow-sm">
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 tracking-widest mb-3 uppercase">
        <span>Cancha {match.field_number}</span>
        {match.group_id && (
          <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 font-bold border border-blue-100">
            {match.group?.name?.substring(0, 6)}
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: ht?.color || '#94a3b8' }} />
          <span className="text-xs font-semibold flex-1 truncate text-slate-800">{ht?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: at?.color || '#94a3b8' }} />
          <span className="text-xs font-semibold flex-1 truncate text-slate-800">{at?.name}</span>
        </div>
      </div>
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
        <span className="font-mono text-slate-500 flex items-center font-medium"><Clock className="w-3 h-3 inline mr-1 text-slate-400" />{match.match_time}</span>
        {match.match_date && (
          <span className="text-orange-600 font-bold uppercase tracking-wider">{new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
        )}
      </div>
    </Link>
  );
}

function FeedCard({ item }: { item: { id: string | number; icon: React.ElementType; iconBg: string; title: string; body: string; time: string; href: string; featured: boolean } }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex gap-3 bg-white border ${item.featured ? 'border-orange-300 shadow-sm' : 'border-slate-200'} p-3 hover:bg-slate-50 transition-colors`}
    >
      <div
        className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-white"
        style={{ background: item.iconBg }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm mb-0.5 leading-tight text-slate-800">{item.title}</div>
        <div className="text-[11px] text-slate-600 leading-snug">{item.body}</div>
        <div className="font-mono text-[9px] text-slate-400 mt-1.5 uppercase tracking-wider font-medium">{item.time}</div>
      </div>
    </Link>
  );
}

