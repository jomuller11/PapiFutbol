import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ProfileShell } from '@/components/player/profile/ProfileShell';
import { getPlayerProfileContext } from '@/lib/queries/player-profile';

type PageParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('players')
    .select('first_name, last_name')
    .eq('id', id)
    .maybeSingle();
  if (!data) return { title: 'Jugador — Liga.9' };
  return { title: `${(data as any).first_name} ${(data as any).last_name} — Liga.9` };
}

export default async function AdminPlayerProfilePage({ params }: PageParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as any)?.role as string | undefined;
  if (role !== 'admin' && role !== 'staff') redirect('/dashboard');

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, nickname, dni, birth_date, phone, reference, position, foot, avatar_url, score, profile:profiles!players_profile_id_fkey(email)')
    .eq('id', id)
    .maybeSingle();

  if (!player) notFound();

  const { activeTournament, registrationStatus, teamName, teamColor } =
    await getPlayerProfileContext(supabase, (player as any).id, true);

  return (
    <ProfileShell
      player={player as any}
      userEmail={(player as any).profile?.email ?? ''}
      activeTournament={activeTournament as any}
      registrationStatus={registrationStatus}
      teamName={teamName}
      teamColor={teamColor}
      editablePlayerId={(player as any).id}
      backHref="/admin/players"
      backLabel="Volver a jugadores"
      titleLabel="PERFIL JUGADOR"
    />
  );
}
