import { createClient } from '@/lib/supabase/server';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Fixture — Liga.9',
  description: 'Todos los partidos del torneo de fútbol 9.',
};

export default async function FixturePage() {
  const supabase = await createClient();

  // Torneo activo
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return <EmptyState message="No hay torneo activo. El fixture aparecerá aquí cuando comience." />;
  }

  // Partidos con equipos
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, match_date, match_time, field_number, round_number,
      status, home_score, away_score,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color)
    `)
    .eq('tournament_id', tournament.id)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true });

  if (!matches || matches.length === 0) {
    return <EmptyState message="El fixture aún no fue publicado. Volvé pronto." />;
  }

  // Agrupar por fecha
  const grouped = matches.reduce<Record<string, typeof matches>>((acc, match) => {
    const key = match.match_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-slate-900">Fixture</h1>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          {tournament.name} · {tournament.year}
        </span>
      </div>

      {Object.entries(grouped).map(([date, dayMatches]) => {
        const isToday = date === today;
        const isPast = date < today;
        const d = new Date(date + 'T00:00:00');
        const label = d.toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });

        return (
          <section key={date}>
            {/* Cabecera de fecha */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex items-center gap-2 text-sm font-semibold ${
                isToday ? 'text-orange-600' : isPast ? 'text-slate-400' : 'text-slate-700'
              }`}>
                <Calendar className="w-4 h-4" />
                <span className="capitalize">{label}</span>
              </div>
              {isToday && (
                <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 uppercase tracking-wider">
                  Hoy
                </span>
              )}
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Partidos del día */}
            <div className="space-y-2">
              {dayMatches.map((match) => (
                <MatchCard key={match.id} match={match} isPast={isPast} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({ match, isPast }: { match: any; isPast: boolean }) {
  const isPlayed = match.status === 'played';
  const isScheduled = match.status === 'scheduled';

  return (
    <Link href={`/match/${match.id}`}>
      <div className={`bg-white border rounded-sm p-4 hover:border-blue-700 hover:shadow-sm transition-all cursor-pointer ${
        isPast && !isPlayed ? 'opacity-60' : ''
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
            <Clock className="w-3 h-3" />
            {match.match_time}
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
            <MapPin className="w-3 h-3" />
            Cancha {match.field_number}
          </div>
          <div className="flex-1" />
          <StatusBadge status={match.status} />
        </div>

        {/* Teams + Score */}
        <div className="flex items-center gap-3">
          {/* Home */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <TeamDot color={match.home_team?.color} />
            <span className="font-semibold text-sm text-slate-900 truncate">
              {match.home_team?.name ?? '—'}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPlayed ? (
              <div className="flex items-center gap-1.5">
                <span className={`text-lg font-bold font-serif w-6 text-right ${
                  match.home_score > match.away_score ? 'text-slate-900' : 'text-slate-400'
                }`}>{match.home_score}</span>
                <span className="text-slate-300 font-bold">—</span>
                <span className={`text-lg font-bold font-serif w-6 text-left ${
                  match.away_score > match.home_score ? 'text-slate-900' : 'text-slate-400'
                }`}>{match.away_score}</span>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1">vs</span>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className="font-semibold text-sm text-slate-900 truncate text-right">
              {match.away_team?.name ?? '—'}
            </span>
            <TeamDot color={match.away_team?.color} />
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}

function TeamDot({ color }: { color?: string }) {
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0 border border-white shadow-sm"
      style={{ backgroundColor: color ?? '#94a3b8' }}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'played') return (
    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 uppercase">
      Final
    </span>
  );
  if (status === 'cancelled') return (
    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 uppercase">
      Suspendido
    </span>
  );
  if (status === 'postponed') return (
    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 uppercase">
      Postergado
    </span>
  );
  return null;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-slate-500">
      <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
