import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DrawClient } from './DrawClient';

export type DrawPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  position: string | null;
  score: number | null;
};

export type DrawTeam = {
  id: string;
  name: string;
  short_name: string;
  color: string;
  current_size: number;
};

export default async function DrawPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as any)?.role;
  if (role !== 'admin' && role !== 'staff') redirect('/admin/dashboard');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-8 text-center max-w-lg mx-auto mt-8">
        <div className="font-semibold text-amber-900 text-lg mb-1">No hay torneo activo</div>
        <div className="text-sm text-amber-800">
          Creá un torneo desde{' '}
          <a href="/admin/tournament" className="underline font-medium">
            Configuración del torneo
          </a>{' '}
          para poder hacer el sorteo.
        </div>
      </div>
    );
  }

  const tournamentId = (tournament as any).id as string;

  const [registrationsRes, teamsRes] = await Promise.all([
    supabase
      .from('player_tournament_registrations')
      .select('player_id, players!inner(id, first_name, last_name, nickname, position, score)')
      .eq('tournament_id', tournamentId)
      .eq('status', 'approved'),

    supabase
      .from('teams')
      .select('id, name, short_name, color, team_memberships(player_id)')
      .eq('tournament_id', tournamentId)
      .order('name'),
  ]);

  const teams: DrawTeam[] = ((teamsRes.data as any[]) ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    color: t.color,
    current_size: (t.team_memberships ?? []).length,
  }));

  const assignedPlayerIds = new Set(
    ((teamsRes.data as any[]) ?? []).flatMap((t: any) =>
      (t.team_memberships ?? []).map((m: any) => m.player_id as string)
    )
  );

  const availablePlayers: DrawPlayer[] = ((registrationsRes.data as any[]) ?? [])
    .filter((r: any) => r.players && !assignedPlayerIds.has(r.player_id as string))
    .map((r: any) => ({
      id: r.players.id,
      first_name: r.players.first_name,
      last_name: r.players.last_name,
      nickname: r.players.nickname ?? null,
      position: r.players.position ?? null,
      score: r.players.score ?? null,
    }));

  return (
    <DrawClient
      tournament={tournament as any}
      availablePlayers={availablePlayers}
      teams={teams}
    />
  );
}
