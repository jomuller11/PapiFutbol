import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Clock, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/actions/auth';
import { LogOut, Trophy } from 'lucide-react';

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!player) redirect('/onboarding');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  let teamId: string | null = null;
  let teamName: string | null = null;
  let teamColor: string | null = null;

  if (tournament) {
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team:teams!inner(id, name, short_name, color, tournament_id)')
      .eq('player_id', (player as any).id)
      .limit(10);

    const current = (memberships ?? []).find(
      (m: any) => m.team?.tournament_id === (tournament as any).id
    );
    if (current) {
      teamId = (current as any).team.id;
      teamName = (current as any).team.name;
      teamColor = (current as any).team.color;
    }
  }

  let matches: any[] = [];

  if (teamId && tournament) {
    const { data } = await supabase
      .from('matches')
      .select(`
        id, round_number, match_date, match_time, field_number, status, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, color),
        observer_team:teams!matches_observer_team_id_fkey(name),
        group:groups!matches_group_id_fkey(name)
      `)
      .eq('tournament_id', (tournament as any).id)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    matches = (data as any[]) ?? [];
  }

  const upcoming = matches.filter(m => m.status === 'scheduled');
  const played = [...matches.filter(m => m.status === 'played')].reverse();
  const initials = ((player as any).first_name?.[0] ?? '') + ((player as any).last_name?.[0] ?? '');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-900 flex items-center justify-center relative">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold text-blue-900">
              Liga<span className="text-orange-500">.</span>9
            </div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest">MIS PARTIDOS</div>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <form action={logout}>
            <button type="submit" className="p-1.5 text-slate-400 hover:text-slate-900" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-900 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        {/* Team banner */}
        {teamName ? (
          <div
            className="p-4 flex items-center gap-3 text-white"
            style={{ backgroundColor: teamColor ?? '#1e3a8a' }}
          >
            <div className="flex-1">
              <div className="font-mono text-[10px] tracking-widest opacity-80 uppercase mb-0.5">
                {tournament ? `${(tournament as any).name} · ${(tournament as any).year}` : 'Torneo activo'}
              </div>
              <div className="font-serif font-bold text-xl">{teamName}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-bold">{matches.length}</div>
              <div className="font-mono text-[10px] opacity-80">partidos</div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 border border-slate-200 p-5 text-center text-sm text-slate-500">
            Todavía no tenés equipo asignado.
          </div>
        )}

        {/* Próximos */}
        {upcoming.length > 0 && (
          <section>
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
              Próximos partidos · {upcoming.length}
            </div>
            <div className="space-y-2">
              {upcoming.map(m => (
                <MatchCard key={m.id} match={m} teamId={teamId!} />
              ))}
            </div>
          </section>
        )}

        {/* Jugados */}
        {played.length > 0 && (
          <section>
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
              Resultados · {played.length}
            </div>
            <div className="space-y-2">
              {played.map(m => (
                <MatchCard key={m.id} match={m} teamId={teamId!} showScore />
              ))}
            </div>
          </section>
        )}

        {matches.length === 0 && teamId && (
          <div className="bg-white border border-slate-200 p-10 text-center text-sm text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No hay partidos programados todavía.
          </div>
        )}
      </main>
    </div>
  );
}

function MatchCard({
  match, teamId, showScore,
}: { match: any; teamId: string; showScore?: boolean }) {
  const ht = match.home_team;
  const at = match.away_team;
  const isHome = ht?.id === teamId;
  const homeWon = match.home_score > match.away_score;
  const awayWon = match.away_score > match.home_score;
  const myTeamWon = isHome ? homeWon : awayWon;
  const drew = showScore && match.home_score === match.away_score;

  return (
    <Link
      href={`/match/${match.id}`}
      className="block bg-white border border-slate-200 hover:border-blue-700 hover:shadow-sm transition-all p-4"
    >
      {/* Meta row */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-3">
        <span>
          Fecha {match.round_number}
          {match.group?.name ? ` · Zona ${match.group.name}` : ''}
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5" /> C.{match.field_number}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {match.match_time}
          </span>
          <span>
            {new Date(match.match_date + 'T12:00:00Z').toLocaleDateString('es-AR', {
              weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
            })}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <TeamLine team={ht} bold={showScore && homeWon} />
          <TeamLine team={at} bold={showScore && awayWon} />
        </div>

        {showScore ? (
          <div className="text-center flex-shrink-0 min-w-[40px]">
            <div className="font-display text-2xl font-bold text-blue-900 leading-none">
              {match.home_score}–{match.away_score}
            </div>
            {!drew && (
              <div className={`font-mono text-[9px] font-semibold mt-1 ${myTeamWon ? 'text-emerald-600' : 'text-red-500'}`}>
                {myTeamWon ? 'GANAMOS' : 'PERDIMOS'}
              </div>
            )}
            {drew && (
              <div className="font-mono text-[9px] font-semibold mt-1 text-amber-600">EMPATE</div>
            )}
          </div>
        ) : (
          <div className="flex-shrink-0">
            <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-2 py-1">
              vs
            </span>
          </div>
        )}
      </div>

      {/* Observer */}
      {match.observer_team && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] font-mono text-slate-400 uppercase tracking-wider">
          Veedor: {match.observer_team.name}
        </div>
      )}
    </Link>
  );
}

function TeamLine({ team, bold }: { team: any; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: team?.color ?? '#94a3b8' }} />
      <span className={`text-sm truncate ${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
        {team?.name ?? '—'}
      </span>
    </div>
  );
}
