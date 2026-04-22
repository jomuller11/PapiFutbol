import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Target, Square, BarChart2, Trophy, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/actions/auth';

const CARD_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  yellow: { label: 'Amarilla', color: '#f59e0b', bg: 'bg-yellow-400' },
  blue:   { label: 'Azul',     color: '#3b82f6', bg: 'bg-blue-500' },
  red:    { label: 'Roja',     color: '#ef4444', bg: 'bg-red-500' },
};

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, score, position')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!player) redirect('/onboarding');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  let goals: any[] = [];
  let cards: any[] = [];
  let gamesPlayed = 0;
  let teamId: string | null = null;
  let teamName: string | null = null;
  let teamColor: string | null = null;

  if (tournament) {
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team:teams!inner(id, name, color, tournament_id)')
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

    // Get played match IDs for this tournament
    const matchFilter = teamId
      ? supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', (tournament as any).id)
          .eq('status', 'played')
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      : supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', (tournament as any).id)
          .eq('status', 'played');

    const { data: playedMatches } = await matchFilter;
    const matchIds = ((playedMatches as any[]) ?? []).map((m: any) => m.id as string);
    gamesPlayed = matchIds.length;

    if (matchIds.length > 0) {
      const [goalsRes, cardsRes] = await Promise.all([
        supabase
          .from('match_goals')
          .select(`
            id, minute, is_own_goal,
            match:matches(id, match_date, round_number,
              home_team:teams!matches_home_team_id_fkey(id, name, color),
              away_team:teams!matches_away_team_id_fkey(id, name, color)
            )
          `)
          .eq('player_id', (player as any).id)
          .in('match_id', matchIds)
          .order('minute', { ascending: true, nullsFirst: false }),

        supabase
          .from('match_cards')
          .select(`
            id, type, minute,
            match:matches(id, match_date, round_number,
              home_team:teams!matches_home_team_id_fkey(id, name, color),
              away_team:teams!matches_away_team_id_fkey(id, name, color)
            )
          `)
          .eq('player_id', (player as any).id)
          .in('match_id', matchIds)
          .order('minute', { ascending: true, nullsFirst: false }),
      ]);

      goals = ((goalsRes.data as any[]) ?? []).filter(g => !g.is_own_goal);
      cards = (cardsRes.data as any[]) ?? [];
    }
  }

  const yellowCount = cards.filter(c => c.type === 'yellow').length;
  const blueCount = cards.filter(c => c.type === 'blue').length;
  const redCount = cards.filter(c => c.type === 'red').length;

  const initials = ((player as any).first_name?.[0] ?? '') + ((player as any).last_name?.[0] ?? '');
  const displayName = (player as any).nickname || (player as any).first_name;

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
            <div className="text-[10px] font-mono text-slate-500 tracking-widest">MIS ESTADÍSTICAS</div>
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

        {/* Player hero */}
        <div className="bg-white border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <div className="font-serif text-xl font-bold text-slate-900">{displayName}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {(player as any).position && (
                <span className="font-mono text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 uppercase tracking-wider">
                  {(player as any).position}
                </span>
              )}
              {teamName && (
                <span
                  className="font-mono text-[10px] px-2 py-0.5 text-white uppercase tracking-wider"
                  style={{ backgroundColor: teamColor ?? '#1e3a8a' }}
                >
                  {teamName}
                </span>
              )}
            </div>
          </div>
          {(player as any).score != null && (
            <div className="text-right">
              <div className="font-display text-4xl font-bold text-blue-900 leading-none">
                {(player as any).score}
              </div>
              <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">Puntaje</div>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Partidos" value={gamesPlayed} icon="calendar" />
          <StatBox label="Goles" value={goals.length} icon="target" accent />
          <StatBox label="Amarillas" dotColor="#f59e0b" value={yellowCount} />
          <StatBox label="Azules" dotColor="#3b82f6" value={blueCount} />
        </div>

        {redCount > 0 && (
          <div className="bg-red-50 border border-red-200 p-3 flex items-center gap-3 text-sm">
            <div className="w-4 h-5 bg-red-500 flex-shrink-0" style={{ borderRadius: '1px', aspectRatio: '2/3' }} />
            <span className="font-semibold text-red-800">{redCount} tarjeta{redCount !== 1 ? 's' : ''} roja{redCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Goles */}
        <section className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-700" />
            <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              Goles
            </span>
            <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 ml-1">
              {goals.length}
            </span>
          </div>
          {goals.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400">Sin goles registrados.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {goals.map(g => {
                const m = g.match;
                const opp = m?.home_team?.id === teamId ? m?.away_team : m?.home_team;
                return (
                  <Link key={g.id} href={`/match/${m?.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-7 h-7 bg-blue-900 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">
                        {opp?.name ?? 'Rival'}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                        Fecha {m?.round_number}
                        {g.minute ? ` · min. ${g.minute}` : ''}
                      </div>
                    </div>
                    {m?.match_date && (
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {new Date(m.match_date + 'T12:00:00Z').toLocaleDateString('es-AR', {
                          day: 'numeric', month: 'short', timeZone: 'UTC',
                        })}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Tarjetas */}
        <section className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Square className="w-4 h-4 text-blue-700" />
            <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              Tarjetas
            </span>
            <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 ml-1">
              {cards.length}
            </span>
          </div>
          {cards.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400">Sin tarjetas. ¡Perfecto!</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cards.map(c => {
                const ct = CARD_LABELS[c.type] ?? CARD_LABELS.yellow;
                const m = c.match;
                const opp = m?.home_team?.id === teamId ? m?.away_team : m?.home_team;
                return (
                  <Link key={c.id} href={`/match/${m?.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div
                      className={`w-4 h-6 ${ct.bg} flex-shrink-0`}
                      style={{ borderRadius: '1px' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">
                        {ct.label} · {opp?.name ?? 'Rival'}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                        Fecha {m?.round_number}
                        {c.minute ? ` · min. ${c.minute}` : ''}
                      </div>
                    </div>
                    {m?.match_date && (
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {new Date(m.match_date + 'T12:00:00Z').toLocaleDateString('es-AR', {
                          day: 'numeric', month: 'short', timeZone: 'UTC',
                        })}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatBox({
  label, value, icon, accent, dotColor,
}: {
  label: string; value: number; icon?: string; accent?: boolean; dotColor?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 p-3 text-center">
      {dotColor ? (
        <div className="w-3 h-3 rounded-full mx-auto mb-1.5" style={{ backgroundColor: dotColor }} />
      ) : icon === 'target' ? (
        <Target className={`w-4 h-4 mx-auto mb-1.5 ${accent ? 'text-blue-700' : 'text-slate-400'}`} />
      ) : (
        <BarChart2 className="w-4 h-4 mx-auto mb-1.5 text-slate-400" />
      )}
      <div className={`font-display text-2xl font-bold leading-none ${accent ? 'text-blue-900' : 'text-slate-800'}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  );
}
