import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Trophy, Users, CalendarDays, UserCheck, ArrowRight,
  Clock, Shield, AlertCircle, CheckCircle2, Target,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { TeamColorSwatch } from '@/components/shared/TeamColorSwatch';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Torneo activo
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year, status, max_teams, players_per_team')
    .eq('status', 'active')
    .maybeSingle();

  // Stats en paralelo
  const tournamentId = (tournament as any)?.id;

  const [
    { count: pendingCount },
    { count: approvedCount },
    { count: teamsCount },
    { count: playedCount },
    { data: upcomingMatches },
    { data: recentMatches },
  ] = await Promise.all([
    // Inscripciones pendientes
    tournamentId
      ? supabase.from('player_tournament_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
    // Jugadores aprobados
    tournamentId
      ? supabase.from('player_tournament_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('status', 'approved')
      : Promise.resolve({ count: 0 }),
    // Equipos
    tournamentId
      ? supabase.from('teams')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
      : Promise.resolve({ count: 0 }),
    // Partidos jugados
    tournamentId
      ? supabase.from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('status', 'played')
      : Promise.resolve({ count: 0 }),
    // Próximos 3 partidos
    tournamentId
      ? supabase.from('matches')
          .select(`
            id, match_date, match_time, field_number, round_number,
            home_team:teams!matches_home_team_id_fkey(name, short_name, color, secondary_color),
            away_team:teams!matches_away_team_id_fkey(name, short_name, color, secondary_color)
          `)
          .eq('tournament_id', tournamentId)
          .eq('status', 'scheduled')
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true })
          .limit(3)
      : Promise.resolve({ data: [] }),
    // Últimos 3 resultados
    tournamentId
      ? supabase.from('matches')
          .select(`
            id, match_date, round_number, home_score, away_score,
            home_team:teams!matches_home_team_id_fkey(name, short_name, color, secondary_color),
            away_team:teams!matches_away_team_id_fkey(name, short_name, color, secondary_color)
          `)
          .eq('tournament_id', tournamentId)
          .eq('status', 'played')
          .order('match_date', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header torneo */}
      {tournament ? (
        <div className="bg-blue-900 text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 stadium-grid opacity-20" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] text-orange-400 tracking-widest font-bold mb-1 uppercase">
                Torneo activo · {(tournament as any).year}
              </div>
              <h1 className="font-display text-3xl font-bold">{(tournament as any).name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-200 font-medium">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {approvedCount ?? 0} jugadores</span>
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> {teamsCount ?? 0} equipos</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {playedCount ?? 0} partidos jugados</span>
              </div>
            </div>
            <Link
              href="/admin/tournament"
              className="bg-white text-blue-900 px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              Gestionar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900">No hay torneo activo</div>
            <div className="text-sm text-amber-800 mt-0.5">Creá un torneo para comenzar a gestionarlo.</div>
            <Link href="/admin/tournament" className="text-sm font-semibold text-amber-900 hover:underline mt-2 inline-flex items-center gap-1">
              Crear torneo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={UserCheck}
          label="Inscripciones pendientes"
          value={pendingCount ?? 0}
          href="/admin/approvals"
          highlight={!!pendingCount && pendingCount > 0}
        />
        <StatCard
          icon={Users}
          label="Jugadores aprobados"
          value={approvedCount ?? 0}
          href="/admin/players"
        />
        <StatCard
          icon={Shield}
          label="Equipos"
          value={teamsCount ?? 0}
          href="/admin/teams"
        />
        <StatCard
          icon={CalendarDays}
          label="Partidos jugados"
          value={playedCount ?? 0}
          href="/admin/fixture"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Próximos partidos */}
        <div className="bg-white border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <span className="font-semibold text-sm">Próximos partidos</span>
            </div>
            <Link href="/admin/fixture" className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingMatches && (upcomingMatches as any[]).length > 0 ? (
            <div className="divide-y divide-slate-100">
              {(upcomingMatches as any[]).map(m => (
                <Link key={m.id} href={`/admin/fixture`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="text-center flex-shrink-0 w-14">
                    <div className="font-mono text-sm font-bold text-blue-900">{(m.match_time as string)?.substring(0, 5)}</div>
                    <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">C.{m.field_number}</div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <MatchTeamRow team={m.home_team} />
                    <MatchTeamRow team={m.away_team} />
                  </div>
                  <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest flex-shrink-0">
                    F{m.round_number}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptySlot text="No hay partidos programados próximamente." />
          )}
        </div>

        {/* Últimos resultados */}
        <div className="bg-white border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-700" />
              <span className="font-semibold text-sm">Últimos resultados</span>
            </div>
            <Link href="/admin/fixture" className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentMatches && (recentMatches as any[]).length > 0 ? (
            <div className="divide-y divide-slate-100">
              {(recentMatches as any[]).map(m => {
                const homeWon = m.home_score > m.away_score;
                const awayWon = m.away_score > m.home_score;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="text-center flex-shrink-0 w-14">
                      <div className="font-display text-xl text-blue-900 leading-none">
                        {m.home_score}–{m.away_score}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mt-1">F{m.round_number}</div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <MatchTeamRow team={m.home_team} bold={homeWon} />
                      <MatchTeamRow team={m.away_team} bold={awayWon} />
                    </div>
                    {!homeWon && !awayWon && (
                      <div className="font-mono text-[9px] text-slate-400 uppercase flex-shrink-0">EMPATE</div>
                    )}
                    {(homeWon || awayWon) && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptySlot text="Aún no hay partidos jugados." />
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-4 gap-3">
        <QuickLink href="/admin/approvals" icon={UserCheck} label="Aprobar inscripciones" badge={pendingCount ?? 0} />
        <QuickLink href="/admin/players" icon={Users} label="Gestionar jugadores" />
        <QuickLink href="/admin/teams" icon={Shield} label="Armar equipos" />
        <QuickLink href="/admin/fixture" icon={CalendarDays} label="Ver fixture" />
      </div>

    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, href, highlight }: {
  icon: React.ElementType; label: string; value: number; href: string; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`bg-white border p-5 block hover:border-blue-700 hover:shadow-sm transition-all group ${
        highlight ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className={`w-5 h-5 ${highlight ? 'text-orange-500' : 'text-slate-400'} group-hover:text-blue-700 transition-colors`} />
        {highlight && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
      </div>
      <div className={`font-display text-4xl font-bold mb-1 ${highlight ? 'text-orange-600' : 'text-blue-900'}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">{label}</div>
    </Link>
  );
}

function QuickLink({ href, icon: Icon, label, badge }: {
  href: string; icon: React.ElementType; label: string; badge?: number;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-slate-200 p-4 flex items-center gap-3 hover:border-blue-700 hover:shadow-sm transition-all group"
    >
      <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-700 flex-shrink-0" />
      <span className="text-sm font-medium text-slate-700 flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="bg-orange-500 text-white text-[10px] font-bold font-mono w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
          {badge}
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-700 flex-shrink-0" />
    </Link>
  );
}

function MatchTeamRow({ team, bold }: { team: any; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TeamColorSwatch team={team} className="w-2.5 h-2.5 rounded-sm flex-shrink-0" />
      <span className={`text-xs truncate ${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
        {team?.name ?? '—'}
      </span>
    </div>
  );
}

function EmptySlot({ text }: { text: string }) {
  return (
    <div className="px-5 py-8 text-center text-sm text-slate-400">{text}</div>
  );
}
