import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Trophy, Calendar, BarChart3, Shield, Zap,
  ChevronRight, Clock, MapPin, ArrowRight
} from 'lucide-react';

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
      <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center text-white px-6 text-center">
        <div className="w-20 h-20 bg-orange-500 flex items-center justify-center mb-6">
          <Trophy className="w-10 h-10 text-white" strokeWidth={2} />
        </div>
        <h1 className="font-serif text-4xl font-bold mb-3">
          Liga<span className="text-orange-400">.</span>9
        </h1>
        <p className="text-blue-300 text-lg mb-2">Torneo de Fútbol 9</p>
        <p className="text-blue-400 text-sm max-w-xs">
          El próximo torneo estará disponible pronto. ¡Volvé después!
        </p>
      </div>
    );
  }

  // Últimos 3 resultados
  const { data: recentMatches } = await supabase
    .from('matches')
    .select(`
      id, match_date, match_time, field_number,
      home_score, away_score, status,
      home_team:teams!matches_home_team_id_fkey(name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(name, short_name, color)
    `)
    .eq('tournament_id', tournament.id)
    .eq('status', 'played')
    .order('match_date', { ascending: false })
    .order('match_time', { ascending: false })
    .limit(3);

  // Próximos 3 partidos
  const today = new Date().toISOString().split('T')[0];
  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select(`
      id, match_date, match_time, field_number, status,
      home_team:teams!matches_home_team_id_fkey(name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(name, short_name, color)
    `)
    .eq('tournament_id', tournament.id)
    .eq('status', 'scheduled')
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
    .limit(3);

  // Top 3 goleadores
  const { data: goals } = await supabase
    .from('match_goals')
    .select(`player_id, match:matches!match_goals_match_id_fkey(tournament_id)`)
    .eq('match.tournament_id', tournament.id)
    .eq('is_own_goal', false);

  const goalCount: Record<string, number> = {};
  for (const g of goals ?? []) {
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
      ...players?.find(p => p.id === id),
      goals: cnt,
    }));
  }

  const navItems = [
    { href: '/fixture', label: 'Fixture', icon: Calendar, desc: 'Todos los partidos' },
    { href: '/standings', label: 'Posiciones', icon: BarChart3, desc: 'Tabla general' },
    { href: '/scorers', label: 'Goleadores', icon: Zap, desc: 'Ranking de goles' },
    { href: '/fair-play', label: 'Fair Play', icon: Shield, desc: 'Conducta en cancha' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-blue-900 text-white -mx-4 -mt-6 px-6 pt-8 pb-10">
        <div className="max-w-lg">
          <div className="text-orange-400 font-mono text-xs uppercase tracking-widest mb-2">
            Torneo Activo · {tournament.year}
          </div>
          <h1 className="font-serif text-3xl font-bold mb-1">{tournament.name}</h1>
          <p className="text-blue-300 text-sm">
            Fútbol 9 colegial · {tournament.fields_count} canchas · {tournament.players_per_team} jugadores por equipo
          </p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        {navItems.map(({ href, label, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border border-slate-200 p-4 hover:border-blue-700 hover:shadow-sm transition-all"
          >
            <Icon className="w-5 h-5 text-blue-700 mb-2" />
            <div className="font-semibold text-sm text-slate-900">{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
          </Link>
        ))}
      </div>

      {/* Próximos partidos */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              Próximos partidos
            </h2>
            <Link href="/fixture" className="text-xs text-blue-700 hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingMatches.map((m) => (
              <MiniMatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Últimos resultados */}
      {recentMatches && recentMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Últimos resultados
            </h2>
            <Link href="/fixture" className="text-xs text-blue-700 hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentMatches.map((m) => (
              <MiniMatchCard key={m.id} match={m} showScore />
            ))}
          </div>
        </section>
      )}

      {/* Top goleadores */}
      {topScorers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Goleadores
            </h2>
            <Link href="/scorers" className="text-xs text-blue-700 hover:underline flex items-center gap-0.5">
              Ver tabla <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-white border border-slate-200 divide-y divide-slate-50">
            {topScorers.map((s, i) => {
              const name = s.nickname ?? `${s.first_name} ${s.last_name}`;
              const teamData = s.team_memberships?.[0]?.team;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="font-mono text-sm font-bold w-5 text-slate-400">{i + 1}</div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: teamData?.color ?? '#94a3b8' }}
                  >
                    {(s.first_name?.[0] ?? '') + (s.last_name?.[0] ?? '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">{name}</div>
                    <div className="text-xs text-slate-400 truncate">{teamData?.name}</div>
                  </div>
                  <div className="font-serif text-xl font-bold text-orange-500">{s.goals}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function MiniMatchCard({ match, showScore }: { match: any; showScore?: boolean }) {
  const ht = match.home_team;
  const at = match.away_team;
  return (
    <Link href={`/match/${match.id}`}>
      <div className="bg-white border border-slate-200 px-4 py-3 hover:border-blue-700 hover:shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 font-mono">
          <Clock className="w-3 h-3" />
          {match.match_time}
          <span className="text-slate-200">·</span>
          <MapPin className="w-3 h-3" />
          Cancha {match.field_number}
          <span className="flex-1" />
          {match.match_date && (
            <span>{new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ht?.color ?? '#94a3b8' }} />
            <span className="text-sm font-semibold text-slate-900 truncate">{ht?.name}</span>
          </div>
          {showScore ? (
            <span className="font-serif font-bold text-sm text-slate-700 flex-shrink-0">
              {match.home_score} — {match.away_score}
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 flex-shrink-0">vs</span>
          )}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-sm font-semibold text-slate-900 truncate text-right">{at?.name}</span>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: at?.color ?? '#94a3b8' }} />
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 ml-1" />
        </div>
      </div>
    </Link>
  );
}
