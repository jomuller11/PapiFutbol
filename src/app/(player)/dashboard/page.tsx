import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Trophy, LogOut, Clock, CheckCircle2, UserCog, ArrowRight,
  ShieldCheck, AlertCircle, Target, Calendar, BarChart2, Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/actions/auth';
import { MatchRow } from '@/components/public/MatchRow';

export default async function PlayerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role === 'admin' || (profile as any)?.role === 'staff') {
    redirect('/admin/dashboard');
  }

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, avatar_url, position, score')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!player) redirect('/onboarding');

  const { data: activeTournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  let registrationStatus = 'none';
  let teamId: string | null = null;
  let teamName: string | null = null;
  let teamColor: string | null = null;

  if (activeTournament) {
    const { data: reg } = await supabase
      .from('player_tournament_registrations')
      .select('status')
      .eq('player_id', (player as any).id)
      .eq('tournament_id', (activeTournament as any).id)
      .maybeSingle();

    if (reg) registrationStatus = (reg as any).status;

    if (registrationStatus === 'approved') {
      const { data: memberships } = await supabase
        .from('team_memberships')
        .select('team:teams!inner(id, name, short_name, color, tournament_id)')
        .eq('player_id', (player as any).id)
        .limit(10);

      const current = (memberships ?? []).find(
        (m: any) => m.team?.tournament_id === (activeTournament as any).id
      );
      if (current) {
        teamId = (current as any).team.id;
        teamName = (current as any).team.name;
        teamColor = (current as any).team.color;
      }
    }
  }

  if (registrationStatus === 'none' && activeTournament) redirect('/onboarding');

  // Partidos del equipo
  let upcomingMatches: any[] = [];
  let recentMatches: any[] = [];
  let gamesPlayed = 0;

  if (teamId && activeTournament) {
    const { data: teamMatches } = await supabase
      .from('matches')
      .select(`
        id, match_date, match_time, field_number, round_number, group_id,
        status, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, color),
        group:groups!matches_group_id_fkey(name)
      `)
      .eq('tournament_id', (activeTournament as any).id)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    const played = (teamMatches ?? []).filter((m: any) => m.status === 'played');
    gamesPlayed = played.length;
    upcomingMatches = (teamMatches ?? []).filter((m: any) => m.status === 'scheduled').slice(0, 3);
    recentMatches = [...played].reverse().slice(0, 3);
  }

  // Stats personales
  let goalsCount = 0;
  let yellowCards = 0;
  let blueCards = 0;
  let redCards = 0;

  if (registrationStatus === 'approved' && activeTournament) {
    const { data: myGoals } = await supabase
      .from('match_goals')
      .select('id, match:matches!match_goals_match_id_fkey(tournament_id)')
      .eq('player_id', (player as any).id)
      .eq('is_own_goal', false)
      .eq('match.tournament_id', (activeTournament as any).id);

    goalsCount = (myGoals ?? []).length;

    const { data: myCards } = await supabase
      .from('match_cards')
      .select('id, card_type, match:matches!match_cards_match_id_fkey(tournament_id)')
      .eq('player_id', (player as any).id)
      .eq('match.tournament_id', (activeTournament as any).id);

    for (const card of (myCards ?? []) as any[]) {
      if (card.card_type === 'yellow') yellowCards++;
      else if (card.card_type === 'blue') blueCards++;
      else if (card.card_type === 'red') redCards++;
    }
  }

  const displayName = (player as any).nickname || (player as any).first_name;
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
            <div className="text-[10px] font-mono text-slate-500 tracking-widest">PANEL JUGADOR</div>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
            {initials || 'JG'}
          </div>
          <div className="text-xs text-slate-600 hidden md:block">
            {(player as any).first_name} {(player as any).last_name}
          </div>
          <form action={logout}>
            <button type="submit" className="p-1.5 text-slate-400 hover:text-slate-900" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        {/* Banner según estado */}
        {registrationStatus === 'pending' && <BannerPending />}
        {registrationStatus === 'waitlist' && <BannerWaitlist />}
        {registrationStatus === 'rejected' && <BannerRejected />}
        {registrationStatus === 'approved' && !teamName && <BannerApprovedNoTeam />}
        {registrationStatus === 'approved' && teamName && (
          <BannerApprovedWithTeam teamName={teamName} teamColor={teamColor} />
        )}

        {/* Saludo + torneo */}
        <div className="bg-white border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-slate-900">Hola, {displayName}</h1>
            {activeTournament && (
              <p className="text-xs font-mono text-slate-500 mt-0.5 tracking-widest uppercase">
                {(activeTournament as any).name} · {(activeTournament as any).year}
              </p>
            )}
          </div>
          {(player as any).score != null && (
            <div className="text-right">
              <div className="font-display text-3xl text-blue-900 leading-none">{(player as any).score}</div>
              <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">Puntaje</div>
            </div>
          )}
        </div>

        {/* Stats personales */}
        {registrationStatus === 'approved' && (
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="Partidos" value={gamesPlayed} icon={Calendar} />
            <StatCard label="Goles" value={goalsCount} icon={Target} accent />
            <StatCard label="Amarillas" value={yellowCards} dotColor="#f59e0b" />
            <StatCard label="Azules" value={blueCards} dotColor="#3b82f6" />
          </div>
        )}

        {/* Próximos partidos */}
        {teamId && upcomingMatches.length > 0 && (
          <Section title="Próximos partidos" icon={Calendar}>
            <div className="space-y-2">
              {upcomingMatches.map(m => (
                <MatchRow key={m.id} match={m} showScore={false} />
              ))}
            </div>
          </Section>
        )}

        {/* Sin partidos próximos pero tiene equipo */}
        {teamId && upcomingMatches.length === 0 && gamesPlayed > 0 && (
          <div className="bg-white border border-slate-200 p-5 text-center text-sm text-slate-500">
            No hay partidos programados próximamente.
          </div>
        )}

        {/* Últimos resultados */}
        {recentMatches.length > 0 && (
          <Section title="Últimos resultados" icon={BarChart2}>
            <div className="space-y-2">
              {recentMatches.map(m => (
                <MatchRow key={m.id} match={m} showScore />
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 mt-3">
              <Link
                href="/fixture"
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                Ver fixture completo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Section>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <QuickCard icon={UserCog} title="Mi perfil" sub="Editar datos y foto" href="/profile" />
          <QuickCard
            icon={Shield}
            title="Fair Play"
            sub="Tabla de conducta"
            href="/fair-play"
          />
        </div>
      </main>
    </div>
  );
}

// ─── Banners ────────────────────────────────────────────────────────────────

function BannerPending() {
  return (
    <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-amber-900">Tu inscripción está pendiente</div>
        <div className="text-xs text-amber-800 mt-0.5">
          El admin está revisando tu solicitud. Te vamos a avisar por email cuando quedes inscripto.
        </div>
      </div>
      <Link href="/onboarding" className="text-xs text-amber-900 font-medium hover:underline flex items-center gap-1 flex-shrink-0">
        Ver estado <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function BannerWaitlist() {
  return (
    <div className="bg-slate-100 border border-slate-200 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-semibold text-slate-900">Estás en lista de espera</div>
        <div className="text-xs text-slate-700 mt-0.5">
          Te avisaremos por email si se libera un lugar en el torneo.
        </div>
      </div>
    </div>
  );
}

function BannerRejected() {
  return (
    <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-red-900">Tu inscripción fue rechazada</div>
        <div className="text-xs text-red-800 mt-0.5">Podés volver a solicitarla si lo deseas.</div>
      </div>
      <Link href="/onboarding" className="text-xs text-red-900 font-medium hover:underline flex items-center gap-1 flex-shrink-0">
        Solicitar de nuevo <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function BannerApprovedNoTeam() {
  return (
    <div className="bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-semibold text-emerald-900">¡Estás inscripto al torneo!</div>
        <div className="text-xs text-emerald-800 mt-0.5">
          El admin va a armar los equipos próximamente. Te vamos a avisar cuando te asignen a uno.
        </div>
      </div>
    </div>
  );
}

function BannerApprovedWithTeam({ teamName, teamColor }: { teamName: string; teamColor: string | null }) {
  return (
    <div className="bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
      <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: teamColor ?? '#1d4ed8' }} />
      <div>
        <div className="text-sm font-semibold text-blue-900">
          Jugás para <strong>{teamName}</strong>
        </div>
        <div className="text-xs text-blue-800 mt-0.5">
          Revisá tus próximos partidos y estadísticas personales.
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, accent, dotColor,
}: {
  label: string;
  value: number;
  icon?: React.ElementType;
  accent?: boolean;
  dotColor?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 p-3 text-center">
      {Icon ? (
        <Icon className={`w-4 h-4 mx-auto mb-1.5 ${accent ? 'text-orange-500' : 'text-slate-400'}`} />
      ) : (
        <div className="w-3.5 h-3.5 rounded-sm mx-auto mb-1.5" style={{ background: dotColor }} />
      )}
      <div className={`font-display text-2xl leading-none ${accent ? 'text-orange-500' : 'text-blue-900'}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-700" />
        <span className="font-semibold text-sm text-slate-900">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ─── Quick Card ──────────────────────────────────────────────────────────────

function QuickCard({
  icon: Icon, title, sub, href,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-slate-200 bg-white p-4 hover:border-blue-700 hover:shadow-sm transition-colors"
    >
      <Icon className="w-5 h-5 mb-2 text-blue-700" />
      <div className="font-semibold text-sm text-slate-900">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </Link>
  );
}
