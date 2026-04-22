import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingShell } from '@/components/player/onboarding/OnboardingShell';

export type OnboardingInitialData = {
  userEmail: string;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
    dni: string;
    birth_date: string;
    phone: string;
    reference: string;
    position: string;
    foot: string;
    avatar_url: string | null;
  } | null;
  activeTournament: { id: string; name: string } | null;
  registrationStatus: string;
  rejectionReason: string | null;
};

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Chequear rol: los staff/admin no hacen onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role === 'admin' || (profile as any)?.role === 'staff') {
    redirect('/admin/dashboard');
  }

  // Cargar jugador (si existe)
  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, dni, birth_date, phone, reference, position, foot, avatar_url')
    .eq('profile_id', user.id)
    .maybeSingle();

  // Torneo activo
  const { data: activeTournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('status', 'active')
    .maybeSingle();

  // Estado de inscripción
  let registrationStatus: string = 'none';
  let rejectionReason: string | null = null;

  if (player && activeTournament) {
    const { data: reg } = await supabase
      .from('player_tournament_registrations')
      .select('status, rejection_reason')
      .eq('player_id', (player as any).id)
      .eq('tournament_id', (activeTournament as any).id)
      .maybeSingle();

    if (reg) {
      registrationStatus = (reg as any).status as typeof registrationStatus;
      rejectionReason = (reg as any).rejection_reason;
    }
  }

  // Si ya está approved, no hay más onboarding que hacer
  if (registrationStatus === 'approved') {
    redirect('/dashboard');
  }

  const data: OnboardingInitialData = {
    userEmail: (profile as any)?.email ?? user.email ?? '',
    player,
    activeTournament,
    registrationStatus,
    rejectionReason,
  };

  return <OnboardingShell data={data} />;
}
