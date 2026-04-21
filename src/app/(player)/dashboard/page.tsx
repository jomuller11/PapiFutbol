import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Trophy, LogOut, Clock, CheckCircle2, UserCog, ArrowRight,
  Users, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/actions/auth';

export default async function PlayerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single();

  // Si por algún motivo cayó acá siendo staff/admin, mandarlo a su panel
  if (profile?.role === 'admin' || profile?.role === 'staff') {
    redirect('/admin/dashboard');
  }

  // Cargar jugador
  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, avatar_url, position, score')
    .eq('profile_id', user.id)
    .maybeSingle();

  // Si no tiene perfil todavía, mandarlo al onboarding
  if (!player) redirect('/onboarding');

  // Torneo activo
  const { data: activeTournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  // Estado de inscripción
  let registrationStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'waitlist' = 'none';
  let teamName: string | null = null;

  if (activeTournament) {
    const { data: reg } = await supabase
      .from('player_tournament_registrations')
      .select('status')
      .eq('player_id', player.id)
      .eq('tournament_id', activeTournament.id)
      .maybeSingle();

    if (reg) registrationStatus = reg.status as typeof registrationStatus;

    // Equipo asignado (si lo hay)
    if (registrationStatus === 'approved') {
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('team:teams!inner(name, tournament_id)')
        .eq('player_id', player.id)
        .limit(10);

      const currentMembership = (membership ?? []).find(
        (m: any) => m.team?.tournament_id === activeTournament.id
      );
      if (currentMembership) {
        teamName = (currentMembership as any).team.name;
      }
    }
  }

  // Si no completó onboarding Y no empezó inscripción, mandarlo a onboarding
  if (registrationStatus === 'none' && activeTournament) {
    redirect('/onboarding');
  }

  const initials = (player.first_name[0] ?? '') + (player.last_name[0] ?? '');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-900 flex items-center justify-center relative">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold text-blue-900">
              Liga<span className="text-orange-500">.</span>9
            </div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest">
              PANEL JUGADOR
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
              {initials || 'JG'}
            </div>
            <div className="text-xs text-slate-600 hidden md:block">
              {player.first_name} {player.last_name}
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="p-1.5 text-slate-400 hover:text-slate-900"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        {/* Banner según estado */}
        {registrationStatus === 'pending' && <BannerPending />}
        {registrationStatus === 'waitlist' && <BannerWaitlist />}
        {registrationStatus === 'rejected' && <BannerRejected />}
        {registrationStatus === 'approved' && !teamName && <BannerApprovedNoTeam />}
        {registrationStatus === 'approved' && teamName && (
          <BannerApprovedWithTeam teamName={teamName} />
        )}

        {/* Placeholder del dashboard */}
        <div className="bg-white border border-slate-200 p-8 mt-6">
          <h1 className="font-serif text-2xl font-bold mb-2">
            Hola, {player.nickname || player.first_name}
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Este es tu panel personal. Próximos pasos de implementación: mis partidos,
            estadísticas personales y notificaciones.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <QuickCard
              icon={UserCog}
              title="Mi perfil"
              sub="Editar datos y foto"
              href="/profile"
            />
            <QuickCard
              icon={Users}
              title="Mis partidos"
              sub="Fixture personal"
              href="/matches"
              disabled
            />
            <QuickCard
              icon={Trophy}
              title="Estadísticas"
              sub="Goles, tarjetas"
              href="/stats"
              disabled
            />
          </div>

          <div className="mt-6 bg-slate-50 border border-slate-100 p-4 font-mono text-xs">
            <div className="text-slate-500 mb-2">DATOS DE SESIÓN</div>
            <div>
              email: <span className="text-slate-900">{profile?.email}</span>
            </div>
            <div>
              role: <span className="text-orange-600">{profile?.role}</span>
            </div>
            <div>
              inscripción: <span className="text-blue-700">{registrationStatus}</span>
            </div>
            {activeTournament && (
              <div>
                torneo activo:{' '}
                <span className="text-slate-900">{activeTournament.name}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Banners
// ─────────────────────────────────────────────────────────────────────────────

function BannerPending() {
  return (
    <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-amber-900">
          Tu inscripción está pendiente
        </div>
        <div className="text-xs text-amber-800 mt-0.5">
          El admin está revisando tu solicitud. Te vamos a avisar por email cuando quedes
          inscripto.
        </div>
      </div>
      <Link
        href="/onboarding"
        className="text-xs text-amber-900 font-medium hover:underline flex items-center gap-1"
      >
        Ver estado <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function BannerWaitlist() {
  return (
    <div className="bg-slate-100 border border-slate-200 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
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
        <div className="text-sm font-semibold text-red-900">
          Tu inscripción fue rechazada
        </div>
        <div className="text-xs text-red-800 mt-0.5">
          Podés volver a solicitarla si lo deseas.
        </div>
      </div>
      <Link
        href="/onboarding"
        className="text-xs text-red-900 font-medium hover:underline flex items-center gap-1"
      >
        Solicitar de nuevo <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function BannerApprovedNoTeam() {
  return (
    <div className="bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-emerald-900">¡Estás inscripto al torneo!</div>
        <div className="text-xs text-emerald-800 mt-0.5">
          El admin va a armar los equipos próximamente. Te vamos a avisar cuando te asignen a uno.
        </div>
      </div>
    </div>
  );
}

function BannerApprovedWithTeam({ teamName }: { teamName: string }) {
  return (
    <div className="bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
      <ShieldCheck className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
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

// ─────────────────────────────────────────────────────────────────────────────

function QuickCard({
  icon: Icon,
  title,
  sub,
  href,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
  href: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`border p-4 transition-colors ${
        disabled
          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
          : 'border-slate-200 bg-white hover:border-blue-700 hover:shadow-sm cursor-pointer'
      }`}
    >
      <Icon className={`w-5 h-5 mb-2 ${disabled ? 'text-slate-400' : 'text-blue-700'}`} />
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      {disabled && (
        <div className="text-[10px] font-mono text-slate-400 mt-2 uppercase tracking-widest">
          Próximamente
        </div>
      )}
    </div>
  );

  if (disabled) return content;
  return <Link href={href}>{content}</Link>;
}
