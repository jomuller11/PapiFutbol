import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TournamentShell } from '@/components/admin/tournament/TournamentShell';

export default async function TournamentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as any)?.role ?? 'staff';

  // Torneo activo o draft más reciente
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fases con sus zonas anidadas
  const { data: phases } = tournament
    ? await supabase
        .from('phases')
        .select(`
          *,
          groups (
            id,
            name,
            order,
            phase_id
          )
        `)
        .eq('tournament_id', (tournament as any).id)
        .order('order')
    : { data: [] };

  // Normalizar el orden de las zonas dentro de cada fase
  const phasesWithSortedGroups = (phases ?? []).map((p: any) => ({
    ...p,
    groups: (p.groups ?? []).sort((a: any, b: any) => a.order - b.order),
  }));

  // Conteo de inscriptos aprobados
  const { count: playersCount } = tournament
    ? await supabase
        .from('player_tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', (tournament as any).id)
        .eq('status', 'approved')
    : { count: 0 };

  return (
    <TournamentShell
      tournament={(tournament as any) ?? null}
      phases={phasesWithSortedGroups}
      approvedPlayersCount={playersCount ?? 0}
      role={role}
    />
  );
}
