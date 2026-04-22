import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileShell } from '@/components/player/profile/ProfileShell';

export const metadata = {
  title: 'Mi Perfil — Liga.9',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role === 'admin' || (profile as any)?.role === 'staff') {
    redirect('/admin/dashboard');
  }

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, dni, birth_date, phone, reference, position, foot, avatar_url, score')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!player) redirect('/onboarding');

  const { data: activeTournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  let registrationStatus = 'none';
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
        .select('team:teams!inner(name, color, tournament_id)')
        .eq('player_id', (player as any).id)
        .limit(10);

      const current = (memberships ?? []).find(
        (m: any) => m.team?.tournament_id === (activeTournament as any).id
      );
      if (current) {
        teamName = (current as any).team.name;
        teamColor = (current as any).team.color;
      }
    }
  }

  return (
    <ProfileShell
      player={player as any}
      userEmail={(profile as any)?.email ?? ''}
      activeTournament={activeTournament as any}
      registrationStatus={registrationStatus}
      teamName={teamName}
      teamColor={teamColor}
    />
  );
}
