import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TournamentShell } from '@/components/admin/tournament/TournamentShell';

export default async function TournamentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Rol del usuario actual
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'staff';

  // Torneo activo o draft más reciente
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fases del torneo actual
  const { data: phases } = tournament
    ? await supabase
        .from('phases')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('order')
    : { data: [] };

  // Conteos de inscriptos aprobados
  const { count: playersCount } = tournament
    ? await supabase
        .from('player_tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .eq('status', 'approved')
    : { count: 0 };

  return (
    <TournamentShell
      tournament={tournament ?? null}
      phases={phases ?? []}
      approvedPlayersCount={playersCount ?? 0}
      role={role}
    />
  );
}

