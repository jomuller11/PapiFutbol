import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileShell } from '@/components/player/profile/ProfileShell';
import { getPlayerProfileContext } from '@/lib/queries/player-profile';

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

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, dni, birth_date, phone, reference, position, foot, avatar_url, score')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!player) {
    if ((profile as any)?.role === 'admin' || (profile as any)?.role === 'staff') {
      redirect('/admin/dashboard');
    }
    redirect('/onboarding');
  }

  const role = (profile as any)?.role as string | undefined;
  const { activeTournament, registrationStatus, teamName, teamColor } =
    await getPlayerProfileContext(
      supabase,
      (player as any).id,
      role === 'admin' || role === 'staff',
    );

  return (
    <ProfileShell
      player={player as any}
      userEmail={(profile as any)?.email ?? ''}
      activeTournament={activeTournament as any}
      registrationStatus={registrationStatus}
      teamName={teamName}
      teamColor={teamColor}
      editablePlayerId={(player as any).id}
      backHref={role === 'admin' || role === 'staff' ? '/admin/dashboard' : '/dashboard'}
      backLabel={role === 'admin' || role === 'staff' ? 'Volver al admin' : 'Volver al panel'}
    />
  );
}
