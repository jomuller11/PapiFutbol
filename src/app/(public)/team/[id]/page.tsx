import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MobileHeader } from '@/components/public/MobileHeader';
import { TeamColorSwatch } from '@/components/shared/TeamColorSwatch';
import { PlayerAvatar } from '@/components/shared/PlayerAvatar';
import { isLightColor } from '@/lib/constants';
import { Shield, MapPin, Clock, Target, Star } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('teams').select('name').eq('id', id).single();
  return { title: data ? `${(data as any).name} — Liga.9` : 'Equipo — Liga.9' };
}

const POSITION_LABELS: Record<string, string> = {
  ARQ: 'Arquero', DFC: 'Defensor central', LAT: 'Lateral',
  MCC: 'Mediocampista', MCO: 'Mediocampista ofensivo',
  EXT: 'Extremo', DEL: 'Delantero',
};

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, short_name, color, secondary_color, logo_url, tournament_id')
    .eq('id', id)
    .single();

  if (!team) notFound();

  const t = team as any;
  const usesLightHeader = isLightColor(t.color) || (!!t.secondary_color && isLightColor(t.secondary_color));
  const headerTextClass = usesLightHeader ? 'text-slate-950' : 'text-white';
  const metaTextClass = usesLightHeader ? 'text-slate-950/70' : 'text-white/70';
  const subMetaTextClass = usesLightHeader ? 'text-slate-950/60' : 'text-white/60';
  const shieldShellClass = usesLightHeader ? 'bg-slate-900/10' : 'bg-white/20';
  const shieldClass = usesLightHeader ? 'text-slate-950' : 'text-white';

  const [rosterRes, matchesRes, groupTeamRes] = await Promise.all([
    adminSupabase
      .from('team_memberships')
      .select('id, jersey_number, is_captain, player:players(id, first_name, last_name, nickname, position, score, avatar_url)')
      .eq('team_id', id)
      .order('jersey_number', { ascending: true, nullsFirst: false }),

    supabase
      .from('matches')
      .select(`
        id, round_number, match_date, match_time, field_number, status, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, color, secondary_color),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, color, secondary_color)
      `)
      .eq('tournament_id', t.tournament_id)
      .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true }),

    supabase
      .from('group_teams')
      .select('group:groups(id, name, phase:phases(name))')
      .eq('team_id', id)
      .limit(1),
  ]);

  const roster = ((rosterRes.data as any[]) ?? []).filter(r => r.player);
  const matches = (matchesRes.data as any[]) ?? [];
  const groupInfo = (groupTeamRes.data as any[])?.[0]?.group ?? null;

  const played = matches.filter(m => m.status === 'played');
  const upcoming = matches.filter(m => m.status === 'scheduled');

  const wins = played.filter(m => {
    const isHome = m.home_team?.id === id;
    return isHome ? m.home_score > m.away_score : m.away_score > m.home_score;
  }).length;
  const draws = played.filter(m => m.home_score === m.away_score).length;
  const losses = played.length - wins - draws;
  const pts = wins * 3 + draws;
  const gf = played.reduce((s: number, m: any) => s + (m.home_team?.id === id ? m.home_score : m.away_score), 0);
  const gc = played.reduce((s: number, m: any) => s + (m.home_team?.id === id ? m.away_score : m.home_score), 0);

  return (
    <div className="bg-slate-50 min-h-screen pb-8 md:max-w-4xl md:mx-auto">
      <MobileHeader title={t.short_name} backHref="/" />

      {/* Hero */}
      <div
        className="px-4 pt-5 pb-4"
        style={{
          background: t.secondary_color
            ? `linear-gradient(135deg, ${t.color} 0%, ${t.color} 50%, ${t.secondary_color} 50%, ${t.secondary_color} 100%)`
            : t.color,
        }}
      >
        <div className="flex items-center gap-4">
          {t.logo_url ? (
            <img src={t.logo_url} alt={t.name} className="w-16 h-16 object-contain bg-white/10 rounded-sm" />
          ) : (
            <div className={`w-16 h-16 flex items-center justify-center rounded-sm ${shieldShellClass}`}>
              <Shield className={`w-8 h-8 opacity-60 ${shieldClass}`} />
            </div>
          )}
          <div>
            <div className={`font-mono text-[10px] uppercase tracking-widest ${metaTextClass}`}>
              {groupInfo ? `${groupInfo.phase?.name ?? 'Fase'} · Zona ${groupInfo.name}` : 'Equipo'}
            </div>
            <div className={`font-serif text-2xl font-bold leading-tight ${headerTextClass}`}>{t.name}</div>
            <div className={`font-mono text-[10px] mt-1 ${subMetaTextClass}`}>{roster.length} jugadores</div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {played.length > 0 && (
        <div className="bg-white border-b border-slate-200 grid grid-cols-6 divide-x divide-slate-100">
          {[
            { label: 'PTS', value: pts },
            { label: 'PJ', value: played.length },
            { label: 'PG', value: wins },
            { label: 'PE', value: draws },
            { label: 'PP', value: losses },
            { label: 'DG', value: `${gf > gc ? '+' : ''}${gf - gc}` },
          ].map(s => (
            <div key={s.label} className="py-3 text-center">
              <div className="font-display text-xl font-bold text-blue-900 leading-none">{s.value}</div>
              <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Plantel */}
        <section className="bg-white border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
            Plantel · {roster.length} jugadores
          </div>
          {roster.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Plantel aún no definido.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {roster.map((m: any) => {
                const p = m.player;
                return (
                  <Link
                    key={m.id}
                    href={`/player/${p.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 text-right font-mono text-xs text-slate-400 flex-shrink-0">
                      {m.jersey_number != null ? `#${m.jersey_number}` : '—'}
                    </div>
                    <PlayerAvatar
                      firstName={p.first_name}
                      lastName={p.last_name}
                      avatarUrl={p.avatar_url}
                      className="w-8 h-8 rounded-full"
                      textClassName="bg-blue-100 text-blue-800 text-xs font-semibold"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {p.first_name} {p.last_name}
                        </span>
                        {m.is_captain && <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                      </div>
                      {p.nickname && (
                        <div className="font-mono text-[9px] text-slate-400">"{p.nickname}"</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.position && (
                        <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-100 px-1.5 py-0.5 uppercase">
                          {p.position}
                        </span>
                      )}
                      {p.score != null && (
                        <span className="font-display text-base font-bold text-blue-900 w-6 text-right">{p.score}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Próximos partidos */}
        {upcoming.length > 0 && (
          <section className="bg-white border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              Próximos · {upcoming.length}
            </div>
            <div className="divide-y divide-slate-100">
              {upcoming.map(m => (
                <MatchRow key={m.id} match={m} teamId={id} />
              ))}
            </div>
          </section>
        )}

        {/* Resultados */}
        {played.length > 0 && (
          <section className="bg-white border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              Resultados · {played.length}
            </div>
            <div className="divide-y divide-slate-100">
              {[...played].reverse().map(m => (
                <MatchRow key={m.id} match={m} teamId={id} showScore />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MatchRow({ match: m, teamId, showScore }: { match: any; teamId: string; showScore?: boolean }) {
  const isHome = m.home_team?.id === teamId;
  const myScore = isHome ? m.home_score : m.away_score;
  const oppScore = isHome ? m.away_score : m.home_score;
  const won = showScore && myScore > oppScore;
  const drew = showScore && myScore === oppScore;
  const opponent = isHome ? m.away_team : m.home_team;

  return (
    <Link
      href={`/match/${m.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
    >
      <div className="w-12 text-center flex-shrink-0">
        <div className="font-mono text-[9px] text-slate-400 uppercase">F{m.round_number}</div>
        <div className="font-mono text-[9px] text-slate-400">{m.match_time?.substring(0, 5)}</div>
      </div>
      <TeamColorSwatch team={opponent} className="w-2 h-2 rounded-full flex-shrink-0" />
      <span className="flex-1 text-sm text-slate-700 truncate">vs {opponent?.name ?? '—'}</span>
      {showScore ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-display text-base font-bold text-blue-900">{myScore}–{oppScore}</span>
          <span className={`font-mono text-[9px] font-semibold uppercase ${won ? 'text-emerald-600' : drew ? 'text-amber-600' : 'text-red-500'}`}>
            {won ? 'G' : drew ? 'E' : 'P'}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-mono text-slate-400">
          <MapPin className="w-3 h-3" /> C.{m.field_number}
          <Clock className="w-3 h-3 ml-1" />
          {new Date(m.match_date + 'T12:00:00Z').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
        </div>
      )}
    </Link>
  );
}
