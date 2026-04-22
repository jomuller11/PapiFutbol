import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MobileHeader } from '@/components/public/MobileHeader';
import { Target, MapPin, Clock } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('players')
    .select('first_name, last_name, nickname')
    .eq('id', id)
    .single();
  if (!data) return { title: 'Jugador — Liga.9' };
  const p = data as any;
  const name = p.nickname ? `${p.nickname} (${p.first_name} ${p.last_name})` : `${p.first_name} ${p.last_name}`;
  return { title: `${name} — Liga.9` };
}

const CARD_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  yellow: { label: 'Amarilla', color: '#f59e0b', bg: 'bg-yellow-400' },
  blue:   { label: 'Azul',     color: '#3b82f6', bg: 'bg-blue-500' },
  red:    { label: 'Roja',     color: '#ef4444', bg: 'bg-red-500' },
};

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, position, foot, score, avatar_url')
    .eq('id', id)
    .single();

  if (!player) notFound();

  const p = player as any;

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  let teamId: string | null = null;
  let teamName: string | null = null;
  let teamColor: string | null = null;
  let goals: any[] = [];
  let cards: any[] = [];

  if (tournament) {
    const tid = (tournament as any).id as string;

    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team:teams!inner(id, name, short_name, color, tournament_id)')
      .eq('player_id', id)
      .limit(10);

    const current = (memberships ?? []).find((m: any) => m.team?.tournament_id === tid);
    if (current) {
      teamId = (current as any).team.id;
      teamName = (current as any).team.name;
      teamColor = (current as any).team.color;
    }

    // Played matches in this tournament (for the team)
    const matchFilter = teamId
      ? supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', tid)
          .eq('status', 'played')
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      : supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', tid)
          .eq('status', 'played');

    const { data: playedMatches } = await matchFilter;
    const matchIds = ((playedMatches as any[]) ?? []).map((m: any) => m.id as string);

    if (matchIds.length > 0) {
      const [goalsRes, cardsRes] = await Promise.all([
        supabase
          .from('match_goals')
          .select(`
            id, minute, is_own_goal,
            match:matches(id, round_number, match_date,
              home_team:teams!matches_home_team_id_fkey(id, name, color),
              away_team:teams!matches_away_team_id_fkey(id, name, color)
            ),
            team:teams(name, color)
          `)
          .eq('player_id', id)
          .in('match_id', matchIds)
          .order('minute', { ascending: true, nullsFirst: false }),

        supabase
          .from('match_cards')
          .select(`
            id, type, minute,
            match:matches(id, round_number, match_date,
              home_team:teams!matches_home_team_id_fkey(id, name, color),
              away_team:teams!matches_away_team_id_fkey(id, name, color)
            )
          `)
          .eq('player_id', id)
          .in('match_id', matchIds)
          .order('minute', { ascending: true, nullsFirst: false }),
      ]);

      goals = ((goalsRes.data as any[]) ?? []).filter(g => !g.is_own_goal);
      cards = (cardsRes.data as any[]) ?? [];
    }
  }

  const displayName = p.nickname || `${p.first_name} ${p.last_name}`;
  const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`;

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title={displayName} backHref="/" />

      {/* Hero */}
      <div className="bg-blue-900 px-4 pt-6 pb-5 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-20" />
        <div className="relative flex items-center gap-4">
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-serif text-2xl font-bold text-white leading-tight truncate">
              {p.first_name} {p.last_name}
            </div>
            {p.nickname && (
              <div className="font-mono text-[10px] text-blue-300 mt-0.5">"{p.nickname}"</div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {p.position && (
                <span className="font-mono text-[9px] bg-white/15 text-white px-2 py-0.5 uppercase tracking-wider">
                  {p.position}
                </span>
              )}
              {teamName && (
                <Link
                  href={`/team/${teamId}`}
                  className="font-mono text-[9px] px-2 py-0.5 text-white uppercase tracking-wider"
                  style={{ backgroundColor: teamColor ?? '#1e3a8a' }}
                >
                  {teamName}
                </Link>
              )}
            </div>
          </div>
          {p.score != null && (
            <div className="text-right flex-shrink-0">
              <div className="font-display text-4xl font-bold text-white leading-none">{p.score}</div>
              <div className="font-mono text-[9px] text-blue-300 uppercase tracking-widest mt-0.5">Puntaje</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white border-b border-slate-200 grid grid-cols-3 divide-x divide-slate-100">
        <StatBox label="Goles" value={goals.length} />
        <StatBox label="Amarillas" value={cards.filter(c => c.type === 'yellow').length} />
        <StatBox label="Tarjetas azules" value={cards.filter(c => c.type === 'blue').length} />
      </div>

      <div className="p-4 space-y-4">
        {/* Goals */}
        {goals.length > 0 && (
          <section className="bg-white border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-700" />
              <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                Goles · {goals.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {goals.map((g: any) => {
                const m = g.match;
                const opp = m?.home_team?.id === teamId ? m?.away_team : m?.home_team;
                return (
                  <Link
                    key={g.id}
                    href={`/match/${m?.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-900 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">vs {opp?.name ?? 'Rival'}</div>
                      <div className="font-mono text-[9px] text-slate-400">
                        Fecha {m?.round_number}
                        {g.minute ? ` · min. ${g.minute}` : ''}
                      </div>
                    </div>
                    {m?.match_date && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(m.match_date + 'T12:00:00Z').toLocaleDateString('es-AR', {
                          day: 'numeric', month: 'short', timeZone: 'UTC',
                        })}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Cards */}
        {cards.length > 0 && (
          <section className="bg-white border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              Tarjetas · {cards.length}
            </div>
            <div className="divide-y divide-slate-100">
              {cards.map((c: any) => {
                const cs = CARD_STYLE[c.type] ?? CARD_STYLE.yellow;
                const m = c.match;
                const opp = m?.home_team?.id === teamId ? m?.away_team : m?.home_team;
                return (
                  <Link
                    key={c.id}
                    href={`/match/${m?.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-4 h-6 ${cs.bg} flex-shrink-0`} style={{ borderRadius: '1px' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{cs.label} · vs {opp?.name ?? '—'}</div>
                      <div className="font-mono text-[9px] text-slate-400">
                        Fecha {m?.round_number}
                        {c.minute ? ` · min. ${c.minute}` : ''}
                      </div>
                    </div>
                    {m?.match_date && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(m.match_date + 'T12:00:00Z').toLocaleDateString('es-AR', {
                          day: 'numeric', month: 'short', timeZone: 'UTC',
                        })}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {goals.length === 0 && cards.length === 0 && (
          <div className="bg-white border border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Sin estadísticas registradas en el torneo activo.
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-3 text-center">
      <div className="font-display text-2xl font-bold text-blue-900 leading-none">{value}</div>
      <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{label}</div>
    </div>
  );
}
