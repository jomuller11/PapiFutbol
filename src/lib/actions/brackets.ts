'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getMatchWinnerSide } from '@/lib/utils/match-notes';

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export type BracketMatch = {
  id: string;
  round_number: number;
  bracket_position: number;
  notes: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  match_date: string;
  match_time: string;
  field_number: number;
  home_team: { id: string; name: string; short_name: string; color: string } | null;
  away_team: { id: string; name: string; short_name: string; color: string } | null;
};

export type BracketData = {
  id: string;
  name: string;
  teams_count: number;
  phase_id: string;
  rounds: BracketMatch[][];
};

type MatchGoalSummary = {
  match_id: string;
  team_id: string;
  is_own_goal: boolean;
};

// ─── Guards ───────────────────────────────────────────────────────────────────

async function requireStaffOrAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as any)?.role;
  if (role !== 'admin' && role !== 'staff') redirect('/dashboard');

  return { supabase, userId: user.id, role };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Standard seeding: seed1 vs seedN, seed2 vs seedN-1, etc.
// Bracket positions pair so winner of pos p advances to ceil(p/2) in next round.
function seededPairs(teamIds: string[]): Array<[string | null, string | null]> {
  const n = teamIds.length;
  const pairs: Array<[string | null, string | null]> = [];
  for (let i = 0; i < n / 2; i++) {
    pairs.push([teamIds[i], teamIds[n - 1 - i]]);
  }
  return pairs;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function assignSlot(idx: number, fieldsCount: number, timeSlots: string[]) {
  return {
    field_number: (idx % fieldsCount) + 1,
    match_time: timeSlots[Math.floor(idx / fieldsCount) % timeSlots.length],
  };
}

function normalizeBracketMatch(m: any): BracketMatch {
  return {
    ...m,
    home_team: Array.isArray(m.home_team) ? m.home_team[0] ?? null : m.home_team ?? null,
    away_team: Array.isArray(m.away_team) ? m.away_team[0] ?? null : m.away_team ?? null,
  };
}

function withDerivedBracketScore(match: BracketMatch, goalsByMatchId: Map<string, MatchGoalSummary[]>) {
  const goals = goalsByMatchId.get(match.id) ?? [];
  if (goals.length === 0 || !match.home_team_id || !match.away_team_id) return match;

  let homeScore = 0;
  let awayScore = 0;

  for (const goal of goals) {
    const creditedTeamId: string | null = goal.is_own_goal
      ? goal.team_id === match.home_team_id
        ? match.away_team_id
        : goal.team_id === match.away_team_id
          ? match.home_team_id
          : null
      : goal.team_id;

    if (creditedTeamId === match.home_team_id) homeScore += 1;
    if (creditedTeamId === match.away_team_id) awayScore += 1;
  }

  return {
    ...match,
    home_score: match.home_score ?? homeScore,
    away_score: match.away_score ?? awayScore,
    status:
      match.status === 'played' || goals.length > 0
        ? 'played'
        : match.status,
  };
}

function isTieResolutionError(error: string) {
  return error.includes('empatado en el global');
}

// ─── generateBracket ──────────────────────────────────────────────────────────

export async function generateBracket(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireStaffOrAdmin();

  const parsed = z.object({
    phase_id: z.string().uuid(),
    name: z.string().min(1).max(80),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    team_ids: z.string().min(1),
  }).safeParse({
    phase_id: formData.get('phase_id'),
    name: formData.get('name'),
    start_date: formData.get('start_date'),
    team_ids: formData.get('team_ids'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos: ' + parsed.error.issues[0]?.message };
  }

  const { phase_id, name, start_date, team_ids: teamIdsRaw } = parsed.data;
  const teamIds = teamIdsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const validCounts = [4, 8, 16];
  if (!validCounts.includes(teamIds.length)) {
    return { success: false, error: `El bracket necesita 4, 8 o 16 equipos (recibidos: ${teamIds.length}).` };
  }

  // Fetch phase → tournament
  const { data: phase } = await supabase
    .from('phases')
    .select('id, tournament_id, type')
    .eq('id', phase_id)
    .single();

  if (!phase) return { success: false, error: 'Fase no encontrada.' };
  if ((phase as any).type !== 'bracket') return { success: false, error: 'La fase no es de tipo eliminatorio.' };

  const tournamentId = (phase as any).tournament_id;

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('fields_count, time_slots')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return { success: false, error: 'Torneo no encontrado.' };

  const fieldsCount: number = (tournament as any).fields_count ?? 1;
  const timeSlots: string[] = (tournament as any).time_slots ?? ['10:00'];

  // Block if bracket with matches already exists for this phase
  const { count: existingMatches } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('phase_id', phase_id)
    .not('bracket_id', 'is', null);

  if (existingMatches && existingMatches > 0) {
    return { success: false, error: 'Ya existe un bracket generado para esta fase.' };
  }

  // Create bracket record
  const { data: bracket, error: bracketError } = await (supabase.from('brackets') as any)
    .insert({ phase_id, name, teams_count: teamIds.length })
    .select('id')
    .single();

  if (bracketError || !bracket) return { success: false, error: bracketError?.message ?? 'Error al crear bracket.' };

  const bracketId = bracket.id;
  const teamsCount = teamIds.length;
  const totalRounds = Math.log2(teamsCount);
  const matchInserts: any[] = [];

  // Round 1: seeded pairs with real teams
  const pairs = seededPairs(teamIds);
  pairs.forEach(([homeId, awayId], idx) => {
    const slotIdx = idx % (fieldsCount * timeSlots.length);
    matchInserts.push({
      tournament_id: tournamentId,
      phase_id,
      bracket_id: bracketId,
      round_number: 1,
      bracket_position: idx + 1,
      home_team_id: homeId,
      away_team_id: awayId,
      match_date: start_date,
      match_time: timeSlots[Math.floor(slotIdx / fieldsCount) % timeSlots.length],
      field_number: (slotIdx % fieldsCount) + 1,
      status: 'scheduled',
    });
  });

  // Future rounds: TBD matches (null teams)
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = teamsCount / Math.pow(2, round);
    const roundDate = addDays(start_date, (round - 1) * 7);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      const slotIdx = (pos - 1) % (fieldsCount * timeSlots.length);
      matchInserts.push({
        tournament_id: tournamentId,
        phase_id,
        bracket_id: bracketId,
        round_number: round,
        bracket_position: pos,
        home_team_id: null,
        away_team_id: null,
        match_date: roundDate,
        match_time: timeSlots[Math.floor(slotIdx / fieldsCount) % timeSlots.length],
        field_number: (slotIdx % fieldsCount) + 1,
        status: 'scheduled',
      });
    }
  }

  const { error: insertError } = await (supabase.from('matches') as any).insert(matchInserts);
  if (insertError) {
    // Roll back bracket record
    await (supabase.from('brackets') as any).delete().eq('id', bracketId);
    return { success: false, error: insertError.message };
  }

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/admin/fixture');
  return { success: true, data: { id: bracketId } };
}

export async function createManualBracketMatches(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireStaffOrAdmin();

  const parsed = z.object({
    bracket_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    team_ids: z.string().min(1),
    two_legged_quarters: z.coerce.boolean().optional(),
    two_legged_semis: z.coerce.boolean().optional(),
  }).safeParse({
    bracket_id: formData.get('bracket_id'),
    start_date: formData.get('start_date'),
    team_ids: formData.get('team_ids'),
    two_legged_quarters: formData.get('two_legged_quarters') === 'true',
    two_legged_semis: formData.get('two_legged_semis') === 'true',
  });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos: ' + parsed.error.issues[0]?.message };
  }

  const {
    bracket_id,
    start_date,
    team_ids: rawTeamIds,
    two_legged_quarters = false,
    two_legged_semis = false,
  } = parsed.data;
  const teamIds = rawTeamIds.split(',').map((value) => value.trim()).filter(Boolean);

  if (teamIds.length !== 8) {
    return { success: false, error: 'Cada copa necesita exactamente 8 equipos para cuartos de final.' };
  }

  if (new Set(teamIds).size !== teamIds.length) {
    return { success: false, error: 'No se puede repetir un equipo dentro de la misma copa.' };
  }

  const { data: bracket } = await supabase
    .from('brackets')
    .select('id, phase_id, teams_count, phase:phases!inner(id, tournament_id, type)')
    .eq('id', bracket_id)
    .single();

  if (!bracket) return { success: false, error: 'Copa no encontrada.' };

  const phase = Array.isArray((bracket as any).phase) ? (bracket as any).phase[0] : (bracket as any).phase;
  if (!phase || phase.type !== 'bracket') {
    return { success: false, error: 'La copa no pertenece a una fase eliminatoria.' };
  }

  const { count: existingMatches } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('bracket_id', bracket_id);

  if (existingMatches && existingMatches > 0) {
    return { success: false, error: 'Esta copa ya tiene cruces cargados.' };
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('fields_count, time_slots')
    .eq('id', phase.tournament_id)
    .single();

  if (!tournament) return { success: false, error: 'Torneo no encontrado.' };

  const fieldsCount: number = (tournament as any).fields_count ?? 1;
  const timeSlots: string[] = (tournament as any).time_slots ?? ['10:00'];

  const pairings: Array<[string, string]> = [];
  for (let index = 0; index < teamIds.length; index += 2) {
    pairings.push([teamIds[index], teamIds[index + 1]]);
  }

  const matchInserts: any[] = [];
  const quarterSecondLegOffset = two_legged_quarters ? 7 : null;
  const semifinalStartOffset = two_legged_quarters ? 14 : 7;
  const semifinalSecondLegOffset = two_legged_semis ? semifinalStartOffset + 7 : null;
  const finalOffset = two_legged_semis ? semifinalStartOffset + 14 : semifinalStartOffset + 7;

  pairings.forEach(([homeId, awayId], idx) => {
    matchInserts.push({
      tournament_id: phase.tournament_id,
      phase_id: phase.id,
      bracket_id,
      round_number: 1,
      bracket_position: idx + 1,
      home_team_id: homeId,
      away_team_id: awayId,
      match_date: start_date,
      status: 'scheduled',
      ...assignSlot(idx, fieldsCount, timeSlots),
    });

    if (two_legged_quarters) {
      matchInserts.push({
        tournament_id: phase.tournament_id,
        phase_id: phase.id,
        bracket_id,
        round_number: 1,
        bracket_position: idx + 1,
        home_team_id: awayId,
        away_team_id: homeId,
        match_date: addDays(start_date, quarterSecondLegOffset!),
        status: 'scheduled',
        notes: 'leg:2',
        ...assignSlot(idx, fieldsCount, timeSlots),
      });
      matchInserts[matchInserts.length - 2].notes = 'leg:1';
    }
  });

  for (let position = 1; position <= 2; position++) {
    matchInserts.push({
      tournament_id: phase.tournament_id,
      phase_id: phase.id,
      bracket_id,
      round_number: 2,
      bracket_position: position,
      home_team_id: null,
      away_team_id: null,
      match_date: addDays(start_date, semifinalStartOffset),
      status: 'scheduled',
      ...assignSlot(position - 1, fieldsCount, timeSlots),
    });

    if (two_legged_semis) {
      matchInserts.push({
        tournament_id: phase.tournament_id,
        phase_id: phase.id,
        bracket_id,
        round_number: 2,
        bracket_position: position,
        home_team_id: null,
        away_team_id: null,
        match_date: addDays(start_date, semifinalSecondLegOffset!),
        status: 'scheduled',
        notes: 'leg:2',
        ...assignSlot(position - 1, fieldsCount, timeSlots),
      });
      matchInserts[matchInserts.length - 2].notes = 'leg:1';
    }
  }

  matchInserts.push({
    tournament_id: phase.tournament_id,
    phase_id: phase.id,
    bracket_id,
    round_number: 3,
    bracket_position: 1,
    home_team_id: null,
    away_team_id: null,
    match_date: addDays(start_date, finalOffset),
    status: 'scheduled',
    ...assignSlot(0, fieldsCount, timeSlots),
  });

  const { error } = await (supabase.from('matches') as any).insert(matchInserts);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/bracket');
  revalidatePath('/admin/fixture');
  revalidatePath('/bracket');
  return { success: true, data: { id: bracket_id } };
}

// ─── advanceBracketWinner ─────────────────────────────────────────────────────

export async function advanceBracketWinner(matchId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(matchId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id, bracket_id, round_number, bracket_position, home_team_id, away_team_id, home_score, away_score, notes, status')
    .eq('id', matchId)
    .single();

  if (!match) return { success: false, error: 'Partido no encontrado.' };

  const m = match as any;
  if (!m.bracket_id) return { success: false, error: 'Este partido no pertenece a un bracket.' };
  if (m.status !== 'played') return { success: false, error: 'El partido aún no tiene resultado.' };
  if (m.home_score === null || m.away_score === null) return { success: false, error: 'Resultado incompleto.' };

  const { data: tieMatches } = await supabase
    .from('matches')
    .select('id, notes, home_team_id, away_team_id, home_score, away_score, status')
    .eq('bracket_id', m.bracket_id)
    .eq('round_number', m.round_number)
    .eq('bracket_position', m.bracket_position)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true });

  const sameTieMatches = (tieMatches as any[]) ?? [];

  let winnerId: string;
  if (sameTieMatches.length <= 1) {
    const singleMatchWinner = getMatchWinnerSide(m.home_score, m.away_score, m.notes);
    if (!singleMatchWinner) {
      return {
        success: false,
        error: 'El cruce quedÃ³ empatado. Definilo manualmente o cargÃ¡ el resultado de los penales.',
      };
    }
    winnerId = singleMatchWinner === 'home' ? m.home_team_id : m.away_team_id;
  } else {
    const legsPlayed = sameTieMatches.every(
      (tieMatch) => tieMatch.status === 'played' && tieMatch.home_score !== null && tieMatch.away_score !== null
    );

    if (!legsPlayed) {
      return { success: true };
    }

    const aggregate = new Map<string, number>();
    for (const tieMatch of sameTieMatches) {
      aggregate.set(tieMatch.home_team_id, (aggregate.get(tieMatch.home_team_id) ?? 0) + tieMatch.home_score);
      aggregate.set(tieMatch.away_team_id, (aggregate.get(tieMatch.away_team_id) ?? 0) + tieMatch.away_score);
    }

    const orderedTeams = Array.from(aggregate.entries()).sort((a, b) => b[1] - a[1]);
    if (orderedTeams.length < 2) {
      return { success: false, error: 'No se pudo determinar el ganador del cruce.' };
    }

    if (orderedTeams[0][1] === orderedTeams[1][1]) {
      return {
        success: false,
        error: 'El cruce quedó empatado en el global. Todavía no hay desempate manual implementado.',
      };
    }

    winnerId = orderedTeams[0][0];
  }

  const nextRound = m.round_number + 1;
  const nextPosition = Math.ceil(m.bracket_position / 2);
  const isHome = m.bracket_position % 2 === 1;

  const { data: nextMatches } = await supabase
    .from('matches')
    .select('id, notes, home_team_id, away_team_id')
    .eq('bracket_id', m.bracket_id)
    .eq('round_number', nextRound)
    .eq('bracket_position', nextPosition)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true });

  const nextTieMatches = (nextMatches as any[]) ?? [];
  if (nextTieMatches.length === 0) {
    return { success: true };
  }

  const update = isHome
    ? { home_team_id: winnerId }
    : { away_team_id: winnerId };

  const { error } = await (supabase.from('matches') as any)
    .update(update)
    .in('id', nextTieMatches.map((nextMatch) => nextMatch.id));

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/admin/fixture');
  return { success: true };
}

export async function resolveBracketTieWinner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const parsed = z.object({
    bracket_id: z.string().uuid(),
    round_number: z.coerce.number().int().min(1),
    bracket_position: z.coerce.number().int().min(1),
    winner_team_id: z.string().uuid(),
  }).safeParse({
    bracket_id: formData.get('bracket_id'),
    round_number: formData.get('round_number'),
    bracket_position: formData.get('bracket_position'),
    winner_team_id: formData.get('winner_team_id'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos para resolver la llave.' };
  }

  const { bracket_id, round_number, bracket_position, winner_team_id } = parsed.data;

  const { data: tieMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, home_score, away_score, status')
    .eq('bracket_id', bracket_id)
    .eq('round_number', round_number)
    .eq('bracket_position', bracket_position);

  const matches = (tieMatches as any[]) ?? [];
  if (matches.length === 0) {
    return { success: false, error: 'No se encontró la llave.' };
  }

  const teamsInTie = new Set(
    matches.flatMap((match) => [match.home_team_id, match.away_team_id]).filter(Boolean)
  );
  if (!teamsInTie.has(winner_team_id)) {
    return { success: false, error: 'El ganador elegido no participa en esta llave.' };
  }

  const allPlayed = matches.every(
    (match) => match.status === 'played' && match.home_score !== null && match.away_score !== null
  );
  if (!allPlayed) {
    return { success: false, error: 'Todavía no se completaron todos los partidos de la llave.' };
  }

  const nextRound = round_number + 1;
  const nextPosition = Math.ceil(bracket_position / 2);
  const isHome = bracket_position % 2 === 1;

  const { data: nextMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('bracket_id', bracket_id)
    .eq('round_number', nextRound)
    .eq('bracket_position', nextPosition);

  const destinationMatches = (nextMatches as any[]) ?? [];
  if (destinationMatches.length === 0) {
    return { success: true };
  }

  const update = isHome
    ? { home_team_id: winner_team_id }
    : { away_team_id: winner_team_id };

  const { error } = await (supabase.from('matches') as any)
    .update(update)
    .in('id', destinationMatches.map((match) => match.id));

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/bracket');
  revalidatePath('/admin/fixture');
  revalidatePath('/bracket');
  return { success: true };
}

// ─── deleteBracket ────────────────────────────────────────────────────────────

export async function deleteBracket(bracketId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(bracketId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  // Block if any match has been played
  const { count: playedCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('bracket_id', bracketId)
    .eq('status', 'played');

  if (playedCount && playedCount > 0) {
    return { success: false, error: `No se puede eliminar: hay ${playedCount} partido(s) jugado(s).` };
  }

  await (supabase.from('matches') as any).delete().eq('bracket_id', bracketId);
  const { error } = await (supabase.from('brackets') as any).delete().eq('id', bracketId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  return { success: true };
}

// ─── getBracketData ───────────────────────────────────────────────────────────

export async function getBracketData(bracketId: string): Promise<BracketData | null> {
  const supabase = await createClient();

  const { data: bracket } = await supabase
    .from('brackets')
    .select('id, name, teams_count, phase_id')
    .eq('id', bracketId)
    .maybeSingle();

  if (!bracket) return null;

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, round_number, bracket_position, notes, home_team_id, away_team_id,
      home_score, away_score, status, match_date, match_time, field_number,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color, secondary_color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color, secondary_color)
    `)
    .eq('bracket_id', (bracket as any).id)
    .order('round_number', { ascending: true })
    .order('bracket_position', { ascending: true });

  const matchIds = ((matches as any[]) ?? []).map((match: any) => match.id as string);
  const { data: goalRows } = matchIds.length
    ? await supabase
        .from('match_goals')
        .select('match_id, team_id, is_own_goal')
        .in('match_id', matchIds)
    : { data: [] as any[] };

  const goalsByMatchId = new Map<string, MatchGoalSummary[]>();
  for (const goal of ((goalRows as any[]) ?? []) as MatchGoalSummary[]) {
    if (!goalsByMatchId.has(goal.match_id)) goalsByMatchId.set(goal.match_id, []);
    goalsByMatchId.get(goal.match_id)!.push(goal);
  }

  const totalRounds = Math.log2((bracket as any).teams_count);
  const rounds: BracketMatch[][] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches = ((matches as any[]) ?? [])
      .filter((m: any) => m.round_number === r)
      .map(normalizeBracketMatch)
      .map((match) => withDerivedBracketScore(match, goalsByMatchId));
    rounds.push(roundMatches);
  }

  return {
    id: (bracket as any).id,
    name: (bracket as any).name,
    teams_count: (bracket as any).teams_count,
    phase_id: (bracket as any).phase_id,
    rounds,
  };
}

export async function getBracketsData(phaseId: string): Promise<BracketData[]> {
  const supabase = await createClient();

  const { data: brackets } = await supabase
    .from('brackets')
    .select('id, name, teams_count, phase_id')
    .eq('phase_id', phaseId)
    .order('created_at', { ascending: true });

  if (!brackets || brackets.length === 0) return [];

  const bracketIds = brackets.map((bracket: any) => bracket.id);

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, bracket_id, round_number, bracket_position, notes, home_team_id, away_team_id,
      home_score, away_score, status, match_date, match_time, field_number,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color, secondary_color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color, secondary_color)
    `)
    .in('bracket_id', bracketIds)
    .order('round_number', { ascending: true })
    .order('bracket_position', { ascending: true });

  const allMatches = (matches as any[]) ?? [];
  const matchIds = allMatches.map((match: any) => match.id as string);
  const { data: goalRows } = matchIds.length
    ? await supabase
        .from('match_goals')
        .select('match_id, team_id, is_own_goal')
        .in('match_id', matchIds)
    : { data: [] as any[] };

  const goalsByMatchId = new Map<string, MatchGoalSummary[]>();
  for (const goal of ((goalRows as any[]) ?? []) as MatchGoalSummary[]) {
    if (!goalsByMatchId.has(goal.match_id)) goalsByMatchId.set(goal.match_id, []);
    goalsByMatchId.get(goal.match_id)!.push(goal);
  }

  return (brackets as any[]).map((bracket: any) => {
    const totalRounds = Math.log2(bracket.teams_count);
    const rounds: BracketMatch[][] = [];

    for (let round = 1; round <= totalRounds; round++) {
      rounds.push(
        allMatches
          .filter((match) => match.bracket_id === bracket.id && match.round_number === round)
          .map(normalizeBracketMatch)
          .map((match) => withDerivedBracketScore(match, goalsByMatchId))
      );
    }

    return {
      id: bracket.id,
      name: bracket.name,
      teams_count: bracket.teams_count,
      phase_id: bracket.phase_id,
      rounds,
    };
  });
}

// ─── getBracketPhases ─────────────────────────────────────────────────────────

export async function getBracketPhases(tournamentId: string) {
  const supabase = await createClient();

  const { data: phases } = await supabase
    .from('phases')
    .select('id, name, type, order, status')
    .eq('tournament_id', tournamentId)
    .eq('type', 'bracket')
    .order('order', { ascending: true });

  return (phases as any[]) ?? [];
}
