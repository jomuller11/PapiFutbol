import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MatchDetailClient } from './MatchDetailClient';

export type RosterPlayer = {
  player_id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  position: string | null;
  jersey_number: number | null;
};

export type GoalRow = {
  id: string;
  minute: number | null;
  is_own_goal: boolean;
  player: { id: string; first_name: string; last_name: string; nickname: string | null } | null;
  team: { id: string; name: string; color: string } | null;
};

export type CardRow = {
  id: string;
  type: 'yellow' | 'red' | 'blue';
  minute: number | null;
  player: { id: string; first_name: string; last_name: string; nickname: string | null } | null;
  team: { id: string; name: string; color: string } | null;
};

export type TeamOption = {
  id: string;
  name: string;
  short_name: string;
  color: string;
};

export type MatchDetailData = {
  id: string;
  round_number: number;
  match_date: string;
  match_time: string;
  field_number: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
  home_team: TeamOption;
  away_team: TeamOption;
  observer_team: TeamOption | null;
  group_name: string | null;
  phase_name: string | null;
  goals: GoalRow[];
  cards: CardRow[];
  home_roster: RosterPlayer[];
  away_roster: RosterPlayer[];
  all_teams: TeamOption[];
};

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rawMatch } = await supabase
    .from('matches')
    .select(`
      id, round_number, match_date, match_time, field_number, status, home_score, away_score, notes,
      tournament_id, home_team_id, away_team_id,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color),
      observer_team:teams!matches_observer_team_id_fkey(id, name, short_name, color),
      group:groups(name),
      phase:phases(name)
    `)
    .eq('id', id)
    .single();

  if (!rawMatch) notFound();

  const m = rawMatch as any;
  const tournamentId = m.tournament_id as string;

  const [goalsRes, cardsRes, homeRosterRes, awayRosterRes, allTeamsRes] = await Promise.all([
    supabase
      .from('match_goals')
      .select(`
        id, minute, is_own_goal,
        player:players(id, first_name, last_name, nickname),
        team:teams(id, name, color)
      `)
      .eq('match_id', id)
      .order('minute', { ascending: true, nullsFirst: false }),

    supabase
      .from('match_cards')
      .select(`
        id, type, minute,
        player:players(id, first_name, last_name, nickname),
        team:teams(id, name, color)
      `)
      .eq('match_id', id)
      .order('minute', { ascending: true, nullsFirst: false }),

    supabase
      .from('team_memberships')
      .select('jersey_number, player:players(id, first_name, last_name, nickname, position)')
      .eq('team_id', m.home_team_id)
      .order('jersey_number', { ascending: true, nullsFirst: false }),

    supabase
      .from('team_memberships')
      .select('jersey_number, player:players(id, first_name, last_name, nickname, position)')
      .eq('team_id', m.away_team_id)
      .order('jersey_number', { ascending: true, nullsFirst: false }),

    supabase
      .from('teams')
      .select('id, name, short_name, color')
      .eq('tournament_id', tournamentId)
      .order('name'),
  ]);

  const toRoster = (rows: any[]): RosterPlayer[] =>
    (rows ?? [])
      .filter((r: any) => r.player)
      .map((r: any) => ({
        player_id: r.player.id,
        first_name: r.player.first_name,
        last_name: r.player.last_name,
        nickname: r.player.nickname ?? null,
        position: r.player.position ?? null,
        jersey_number: r.jersey_number ?? null,
      }));

  const matchData: MatchDetailData = {
    id: m.id,
    round_number: m.round_number,
    match_date: m.match_date,
    match_time: m.match_time,
    field_number: m.field_number,
    status: m.status,
    home_score: m.home_score,
    away_score: m.away_score,
    notes: m.notes ?? null,
    home_team: m.home_team,
    away_team: m.away_team,
    observer_team: m.observer_team ?? null,
    group_name: m.group?.name ?? null,
    phase_name: m.phase?.name ?? null,
    goals: ((goalsRes.data as any[]) ?? []) as GoalRow[],
    cards: ((cardsRes.data as any[]) ?? []) as CardRow[],
    home_roster: toRoster(homeRosterRes.data as any[] ?? []),
    away_roster: toRoster(awayRosterRes.data as any[] ?? []),
    all_teams: ((allTeamsRes.data as any[]) ?? []) as TeamOption[],
  };

  return <MatchDetailClient match={matchData} />;
}
