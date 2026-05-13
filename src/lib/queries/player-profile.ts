import 'server-only';

type SupabaseLike = { from: (table: string) => any };

export type PlayerProfileContext = {
  activeTournament: { id: string; name: string; year: number } | null;
  registrationStatus: string;
  teamName: string | null;
  teamColor: string | null;
};

/**
 * Fetches tournament context for a player: active tournament, registration
 * status, and current team assignment.
 *
 * @param alwaysShowTeam - when true (admin view), skips the approval check
 *   before fetching team membership.
 */
export async function getPlayerProfileContext(
  supabase: SupabaseLike,
  playerId: string,
  alwaysShowTeam = false,
): Promise<PlayerProfileContext> {
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
      .eq('player_id', playerId)
      .eq('tournament_id', activeTournament.id)
      .maybeSingle();

    if (reg) registrationStatus = (reg as any).status;

    if (alwaysShowTeam || registrationStatus === 'approved') {
      const { data: memberships } = await supabase
        .from('team_memberships')
        .select('team:teams!inner(name, color, tournament_id)')
        .eq('player_id', playerId)
        .limit(10);

      const current = ((memberships as any[]) ?? []).find(
        (m: any) => m.team?.tournament_id === activeTournament.id,
      );
      if (current) {
        teamName = (current as any).team.name;
        teamColor = (current as any).team.color;
      }
    }
  }

  return {
    activeTournament: activeTournament as PlayerProfileContext['activeTournament'],
    registrationStatus,
    teamName,
    teamColor,
  };
}
