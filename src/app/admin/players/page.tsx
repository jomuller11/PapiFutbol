import { createClient } from '@/lib/supabase/server';
import { PlayersPageClient } from '@/components/admin/players/PlayersPageClient';
import type { PlayerPosition, PlayerReference } from '@/types/database';

export type PlayerWithStats = {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  dni: string;
  birth_date: string;
  phone: string;
  email: string;
  position: PlayerPosition;
  foot: 'derecho' | 'izquierdo' | 'ambidiestro';
  reference: PlayerReference;
  score: number | null;
  avatar_url: string | null;
  team_name: string | null;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  blue_cards: number;
  matches_played: number;
};

export default async function AdminPlayersPage() {
  const supabase = await createClient();

  // 1. Obtener todos los jugadores con su profile (para el email)
  const { data: players, error } = await supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      nickname,
      dni,
      birth_date,
      phone,
      position,
      foot,
      reference,
      score,
      avatar_url,
      profile:profiles!inner(email)
    `)
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Error cargando jugadores:', error);
    return (
      <div className="max-w-5xl mx-auto bg-red-50 border border-red-200 p-6 text-red-800">
        <p className="font-semibold">No pudimos cargar los jugadores.</p>
        <p className="text-xs mt-1 font-mono">{error.message}</p>
      </div>
    );
  }

  // 2. Obtener stats agregadas (goles, tarjetas, equipo actual)
  //    Usamos la view v_player_stats del torneo activo.
  const { data: activeTournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('status', 'active')
    .maybeSingle();

  let statsByPlayer: Record<string, {
    goals: number;
    yellow: number;
    red: number;
    blue: number;
    matches: number;
  }> = {};
  let teamsByPlayer: Record<string, string> = {};

  if (activeTournament) {
    // Goles
    const { data: goals } = await supabase
      .from('match_goals')
      .select('player_id, match:matches!inner(tournament_id, status)')
      .eq('match.tournament_id', activeTournament.id)
      .eq('match.status', 'played');

    // Tarjetas
    const { data: cards } = await supabase
      .from('match_cards')
      .select('player_id, type, match:matches!inner(tournament_id, status)')
      .eq('match.tournament_id', activeTournament.id)
      .eq('match.status', 'played');

    // Equipos (por torneo activo)
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('player_id, team:teams!inner(name, tournament_id)')
      .eq('team.tournament_id', activeTournament.id);

    // Agregar goles
    (goals ?? []).forEach(g => {
      if (!statsByPlayer[g.player_id]) {
        statsByPlayer[g.player_id] = { goals: 0, yellow: 0, red: 0, blue: 0, matches: 0 };
      }
      statsByPlayer[g.player_id].goals += 1;
    });

    // Agregar tarjetas
    (cards ?? []).forEach(c => {
      if (!statsByPlayer[c.player_id]) {
        statsByPlayer[c.player_id] = { goals: 0, yellow: 0, red: 0, blue: 0, matches: 0 };
      }
      if (c.type === 'yellow') statsByPlayer[c.player_id].yellow += 1;
      if (c.type === 'red') statsByPlayer[c.player_id].red += 1;
      if (c.type === 'blue') statsByPlayer[c.player_id].blue += 1;
    });

    // Mapear equipos
    (memberships ?? []).forEach((m: any) => {
      if (m.team?.name) teamsByPlayer[m.player_id] = m.team.name;
    });
  }

  // 3. Combinar datos
  const playersWithStats: PlayerWithStats[] = (players ?? []).map((p: any) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    nickname: p.nickname,
    dni: p.dni,
    birth_date: p.birth_date,
    phone: p.phone,
    email: p.profile?.email ?? '',
    position: p.position,
    foot: p.foot,
    reference: p.reference,
    score: p.score,
    avatar_url: p.avatar_url,
    team_name: teamsByPlayer[p.id] ?? null,
    goals: statsByPlayer[p.id]?.goals ?? 0,
    yellow_cards: statsByPlayer[p.id]?.yellow ?? 0,
    red_cards: statsByPlayer[p.id]?.red ?? 0,
    blue_cards: statsByPlayer[p.id]?.blue ?? 0,
    matches_played: statsByPlayer[p.id]?.matches ?? 0,
  }));

  return <PlayersPageClient players={playersWithStats} />;
}
