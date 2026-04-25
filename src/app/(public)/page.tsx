import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Trophy, CalendarDays, BarChart3, Shield, Zap,
  ChevronRight, Clock, Hash, Users
} from 'lucide-react';
import { MatchRow } from '@/components/public/MatchRow';
import { SiteBrand, SiteBrandMark } from '@/components/branding/SiteBrand';
import { TeamColorSwatch } from '@/components/shared/TeamColorSwatch';
import { PlayerAvatar } from '@/components/shared/PlayerAvatar';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Liga.9 — Torneo de Fútbol 9',
  description: 'Seguí todos los partidos, posiciones y estadísticas del torneo de fútbol 9.',
};

type HomeStandingRow = {
  team_id: string; team_name: string; color: string; secondary_color?: string | null; group_name: string;
  pj: number; gf: number; gc: number; dg: number; pts: number;
};

export default async function PublicHomePage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, brand_name, logo_url, year, fields_count, players_per_team, max_teams')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4">
          <SiteBrand size="md" />
        </div>
        <p className="text-slate-500 text-sm">Pronto habrá un torneo activo.</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const [recentMatchesRes, upcomingMatchesRes, goalsRes, teamsWithGroupsRes, allPlayedRes] =
    await Promise.all([
      supabase
        .from('matches')
        .select(`
          id, match_date, match_time, field_number, round_number,
          home_score, away_score, status, group_id,
          home_team:teams!matches_home_team_id_fkey(name, short_name, color, secondary_color),
          away_team:teams!matches_away_team_id_fkey(name, short_name, color, secondary_color),
          group:groups!matches_group_id_fkey(name)
        `)
        .eq('tournament_id', (tournament as any).id)
        .eq('status', 'played')
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: false })
        .limit(3),

      supabase
        .from('matches')
        .select(`
          id, match_date, match_time, field_number, round_number, status, group_id,
          home_team:teams!matches_home_team_id_fkey(name, short_name, color, secondary_color),
          away_team:teams!matches_away_team_id_fkey(name, short_name, color, secondary_color),
          group:groups!matches_group_id_fkey(name)
        `)
        .eq('tournament_id', (tournament as any).id)
        .eq('status', 'scheduled')
        .gte('match_date', today)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
        .limit(4),

      adminSupabase
        .from('match_goals')
        .select(`player_id, match:matches!match_goals_match_id_fkey!inner(tournament_id)`)
        .eq('match.tournament_id', (tournament as any).id)
        .eq('is_own_goal', false),

      supabase
        .from('teams')
        .select('id, name, color, secondary_color, group_teams(groups(name))')
        .eq('tournament_id', (tournament as any).id)
        .order('name'),

      supabase
        .from('matches')
        .select('home_team_id, away_team_id, home_score, away_score')
        .eq('tournament_id', (tournament as any).id)
        .eq('status', 'played'),
    ]);

  const recentMatches = recentMatchesRes.data;
  const upcomingMatches = upcomingMatchesRes.data;

  // Top 5 scorers
  const goalCount: Record<string, number> = {};
  for (const g of (goalsRes.data as any[]) ?? []) {
    if (g.player_id) goalCount[g.player_id] = (goalCount[g.player_id] ?? 0) + 1;
  }
  const topScorerIds = Object.entries(goalCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, cnt]) => ({ id, cnt }));

  let topScorers: any[] = [];
  if (topScorerIds.length > 0) {
    const { data: players } = await adminSupabase
      .from('players')
      .select('id, first_name, last_name, nickname, position, avatar_url, team_memberships(team:teams(name, color, secondary_color))')
      .in('id', topScorerIds.map(s => s.id));
    topScorers = topScorerIds.map(({ id, cnt }) => ({
      ...(players?.find((p: any) => p.id === id) as any),
      goals: cnt,
    }));
  }

  // Compute standings by group for desktop mini-section
  let standingsByGroup: { groupName: string; rows: HomeStandingRow[] }[] = [];
  if (teamsWithGroupsRes.data && teamsWithGroupsRes.data.length > 0) {
    const standingMap: Record<string, HomeStandingRow> = {};
    for (const t of teamsWithGroupsRes.data as any[]) {
      standingMap[t.id] = {
        team_id: t.id, team_name: t.name, color: t.color, secondary_color: t.secondary_color ?? null,
        group_name: t.group_teams?.[0]?.groups?.name || '',
        pj: 0, gf: 0, gc: 0, dg: 0, pts: 0,
      };
    }
    for (const m of (allPlayedRes.data as any[]) ?? []) {
      const home = standingMap[m.home_team_id];
      const away = standingMap[m.away_team_id];
      if (!home || !away) continue;
      home.pj++; home.gf += m.home_score ?? 0; home.gc += m.away_score ?? 0;
      away.pj++; away.gf += m.away_score ?? 0; away.gc += m.home_score ?? 0;
      if ((m.home_score ?? 0) > (m.away_score ?? 0)) { home.pts += 3; }
      else if ((m.away_score ?? 0) > (m.home_score ?? 0)) { away.pts += 3; }
      else { home.pts += 1; away.pts += 1; }
    }
    const allRows = Object.values(standingMap)
      .map(r => ({ ...r, dg: r.gf - r.gc }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
    const groupMap = new Map<string, HomeStandingRow[]>();
    for (const row of allRows) {
      if (!row.group_name) continue;
      if (!groupMap.has(row.group_name)) groupMap.set(row.group_name, []);
      groupMap.get(row.group_name)!.push(row);
    }
    standingsByGroup = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, rows]) => ({ groupName, rows }));
  }

  // Feed items from recent matches
  type FeedItem = { id: string | number; icon: React.ElementType; iconBg: string; title: string; body: string; time: string; href: string; featured: boolean };
  const feedItems: FeedItem[] = (recentMatches as any[] ?? []).slice(0, 3).map((m: any) => {
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

  const t = tournament as any;

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-40" />
        <div className="absolute inset-0 noise opacity-50" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-orange-500/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-1.5 md:h-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />

        <div className="relative max-w-6xl mx-auto px-5 md:px-8 pt-5 pb-8 md:py-16">
          <div className="md:grid md:grid-cols-2 md:gap-12 md:items-center">

            {/* Left: branding + title */}
            <div>
              {/* Mobile top bar (logo + status badge) */}
              <div className="flex items-center justify-end mb-4 md:hidden">
                <div className="hidden">
                  <div className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-orange-300">
                    Colegio Marista San José · Morón
                  </div>
                  <div className="text-3xl font-black leading-none text-white">
                    Papi Fútbol
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 backdrop-blur text-[9px] font-mono tracking-widest">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                  EN JUEGO
                </div>
              </div>

              <div className="font-mono text-[10px] md:text-[11px] text-orange-400 tracking-[0.2em] md:tracking-[0.3em] font-bold mb-1 md:mb-3 uppercase">
                EDICIÓN {t.year} · EN CURSO
              </div>
              <div className="hidden mb-4">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-orange-300 mb-1">
                  Colegio Marista San José · Morón
                </div>
                <div className="text-6xl font-black leading-none text-white">
                  Papi Fútbol
                </div>
              </div>
              <h1 className="font-display text-[44px] md:text-[80px] leading-[0.9] mb-3 md:mb-5 uppercase tracking-wide">
                {t.name.split(' ')[0]}<br />
                {t.name.split(' ').slice(1).join(' ')}
              </h1>

              {/* Mobile stats row */}
              <div className="flex items-center gap-3 text-xs text-blue-100 font-medium md:hidden">
                <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.max_teams} eq.</div>
                <div className="w-0.5 h-3 bg-white/20" />
                <div className="flex items-center gap-1"><Hash className="w-3 h-3" /> F9</div>
                <div className="w-0.5 h-3 bg-white/20" />
                <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> SÁB.</div>
              </div>

              {/* Desktop description + CTAs */}
              <p className="hidden md:block text-blue-100 text-lg mb-6 max-w-md leading-relaxed">
                El torneo de fútbol 9 del colegio. {t.max_teams} equipos, fechas todos los sábados, pura intensidad.
              </p>
              <div className="hidden md:flex items-center gap-3">
                <Link href="/fixture" className="bg-orange-500 text-white px-5 py-3 font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Ver próxima fecha
                </Link>
                <Link href="/standings" className="border border-white/30 text-white px-5 py-3 font-semibold hover:bg-white/10 transition-colors">
                  Tabla de posiciones
                </Link>
              </div>
            </div>

            {/* Right: mini scoreboard (desktop only) */}
            {upcomingMatches && upcomingMatches.length > 0 && (
              <div className="hidden md:block bg-white/5 backdrop-blur border border-white/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-mono text-[10px] text-orange-400 tracking-widest font-bold">PRÓXIMA FECHA</div>
                  {(upcomingMatches as any[])[0]?.match_date && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono bg-white/10 px-2 py-0.5">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                      {new Date((upcomingMatches as any[])[0].match_date + 'T00:00:00')
                        .toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {(upcomingMatches as any[]).map((m: any) => (
                    <Link key={m.id} href={`/match/${m.id}`} className="bg-white/5 hover:bg-white/10 p-2.5 flex items-center gap-3 text-xs transition-colors">
                      <div className="font-mono text-white/50 w-10 flex-shrink-0">{m.match_time?.slice(0, 5)}</div>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <TeamColorSwatch team={m.home_team} className="w-2 h-2 flex-shrink-0" />
                        <span className="flex-1 truncate">{m.home_team?.short_name || m.home_team?.name}</span>
                        <span className="text-white/40 font-mono text-[10px]">vs</span>
                        <span className="flex-1 truncate text-right">{m.away_team?.short_name || m.away_team?.name}</span>
                        <TeamColorSwatch team={m.away_team} className="w-2 h-2 flex-shrink-0" />
                      </div>
                      <div className="font-mono text-[9px] bg-white/10 px-1.5 py-0.5 flex-shrink-0">C{m.field_number}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE: Quick actions ─────────────────────────────── */}
      <div className="md:hidden grid grid-cols-3 gap-2 px-4 -mt-4 relative z-10 mb-6">
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

      {/* ── MOBILE: Próxima fecha ─────────────────────────────── */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <div className="md:hidden">
          <SectionTitle title="Próxima fecha" sub={`Fecha ${(upcomingMatches as any[])[0].round_number}`} actionLabel="Ver fixture" onAction="/fixture" />
          <div className="px-4 mb-6">
            <div className="flex gap-3 overflow-x-auto hide-scroll -mx-4 px-4 pb-2 pt-1">
              {(upcomingMatches as any[]).map(m => (
                <MatchCardHorizontal key={m.id} match={m} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP: 3-column content grid ───────────────────── */}
      <div className="hidden md:block">
        <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-3 gap-10">

          {/* Novedades (2/3) */}
          <div className="col-span-2">
            <div className="font-mono text-[10px] text-orange-600 tracking-widest font-bold mb-1">EL TORNEO HOY</div>
            <h2 className="font-display text-4xl mb-5">Novedades</h2>
            <div className="space-y-3">
              {feedItems.map(item => <FeedCard key={item.id} item={item} />)}
            </div>
          </div>

          {/* Artilleros sidebar (1/3) */}
          <div>
            <div className="font-mono text-[10px] text-orange-600 tracking-widest font-bold mb-1">PIE DE ORO</div>
            <h2 className="font-display text-4xl mb-4">Artilleros</h2>
            {topScorers.length > 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm">
                {topScorers.map((s, i) => {
                  const teamData = s.team_memberships?.[0]?.team;
                  const name = s.nickname ?? `${s.first_name} ${s.last_name}`;
                  return (
                    <Link key={s.id} href={`/player/${s.id}`} className="p-3 flex items-center gap-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 font-display text-base flex items-center justify-center text-white flex-shrink-0 ${
                        i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300 !text-slate-600'
                      }`}>
                        {i + 1}
                      </div>
                      <PlayerAvatar
                        firstName={s.first_name}
                        lastName={s.last_name}
                        avatarUrl={s.avatar_url}
                        className="w-9 h-9 rounded-full"
                        textClassName="bg-blue-100 text-blue-900 text-xs font-semibold"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-slate-800">{name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <TeamColorSwatch team={teamData} className="w-1.5 h-1.5 rounded-sm flex-shrink-0" />
                          <span className="truncate">{teamData?.name}</span>
                        </div>
                      </div>
                      <div className="font-display text-2xl text-blue-900 flex-shrink-0">{s.goals}</div>
                    </Link>
                  );
                })}
                <Link href="/scorers" className="block p-3 text-center text-xs text-blue-700 font-semibold tracking-wide hover:bg-slate-50 transition-colors border-t border-slate-100">
                  Ver ranking completo →
                </Link>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-6 text-center text-sm text-slate-400">
                Aún no hay goles registrados.
              </div>
            )}
          </div>
        </div>

        {/* Desktop standings mini-section */}
        {standingsByGroup.length > 0 && (
          <div className="max-w-6xl mx-auto px-8 pb-16">
            <div className="font-mono text-[10px] text-orange-600 tracking-widest font-bold mb-1">CLASIFICACIÓN</div>
            <div className="flex items-end justify-between mb-5">
              <h2 className="font-display text-4xl">Posiciones</h2>
              <Link href="/standings" className="text-sm text-blue-700 font-semibold flex items-center gap-0.5">
                Ver completa <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className={`grid gap-6 ${standingsByGroup.length >= 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-lg'}`}>
              {standingsByGroup.map(({ groupName, rows }) => (
                <div key={groupName} className="bg-white border border-slate-200 shadow-sm">
                  <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="font-display text-lg">
                      {groupName.toUpperCase().startsWith('ZONA') ? groupName.toUpperCase() : `ZONA ${groupName.toUpperCase()}`}
                    </div>
                    <Link href="/standings" className="text-xs text-blue-700 font-semibold">Ver completa →</Link>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-[10px] font-mono text-slate-500 uppercase bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2">#</th>
                        <th className="text-left py-2">Equipo</th>
                        <th className="text-center py-2">PJ</th>
                        <th className="text-center py-2">DG</th>
                        <th className="text-center py-2 px-4">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 6).map((r, i) => (
                        <tr key={r.team_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-slate-400 text-sm">{i + 1}</td>
                          <td className="py-2.5">
                            <Link href={`/team/${r.team_id}`} className="flex items-center gap-2 hover:text-blue-700">
                              {i === 0 && <div className="w-1 h-5 bg-emerald-500 -ml-1 flex-shrink-0" />}
                              <TeamColorSwatch team={r} className="w-3 h-3 flex-shrink-0" />
                              <span className="font-semibold text-slate-800">{r.team_name}</span>
                            </Link>
                          </td>
                          <td className="text-center font-mono py-2.5">{r.pj}</td>
                          <td className="text-center font-mono py-2.5">{r.dg > 0 ? '+' : ''}{r.dg}</td>
                          <td className="text-center font-display text-lg px-4 text-blue-900 py-2.5">{r.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desktop footer */}
        <footer className="bg-blue-950 text-white py-10">
          <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SiteBrandMark size={40} logoUrl={t.logo_url} />
              <div>
                <div className="text-lg font-black">{t.brand_name ?? 'Papi Fútbol'}</div>
                <div className="text-[10px] font-mono text-blue-300">{t.name.toUpperCase()} {t.year}</div>
              </div>
            </div>
            <div className="text-xs text-blue-300">Torneo Colegial · © {t.year}</div>
          </div>
        </footer>
      </div>

      {/* ── MOBILE: Feed + Results + Scorers ─────────────────── */}
      <div className="md:hidden pb-8">
        <SectionTitle title="Novedades" sub="Lo último del torneo" />
        <div className="px-4 space-y-3 mb-6">
          {feedItems.map(item => <FeedCard key={item.id} item={item} />)}
        </div>

        {recentMatches && recentMatches.length > 0 && (
          <>
            <SectionTitle title="Últimos resultados" sub={`Fecha ${(recentMatches as any[])[0].round_number}`} actionLabel="Ver todos" onAction="/fixture" />
            <div className="px-4 space-y-2 mb-6">
              {(recentMatches as any[]).map(m => <MatchRow key={m.id} match={m} showScore />)}
            </div>
          </>
        )}

        {topScorers.length > 0 && (
          <>
            <SectionTitle title="Artilleros" actionLabel="Ranking" onAction="/scorers" />
            <div className="px-4 mb-6">
              <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
                {topScorers.slice(0, 3).map((s, i) => {
                  const teamData = s.team_memberships?.[0]?.team;
                  const name = s.nickname ?? `${s.first_name} ${s.last_name}`;
                  return (
                    <Link key={s.id} href={`/player/${s.id}`} className="p-3 flex items-center gap-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 font-display text-base flex items-center justify-center text-white ${
                        i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'
                      }`}>
                        {i + 1}
                      </div>
                      <PlayerAvatar
                        firstName={s.first_name}
                        lastName={s.last_name}
                        avatarUrl={s.avatar_url}
                        className="w-9 h-9 rounded-full"
                        textClassName="bg-blue-100 text-blue-900 text-xs font-semibold"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-slate-800">{name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <TeamColorSwatch team={teamData} className="w-1.5 h-1.5 rounded-sm" />
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
          <TeamColorSwatch team={ht} className="w-3 h-3 rounded-sm flex-shrink-0" />
          <span className="text-xs font-semibold flex-1 truncate text-slate-800">{ht?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <TeamColorSwatch team={at} className="w-3 h-3 rounded-sm flex-shrink-0" />
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
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-white" style={{ background: item.iconBg }}>
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
