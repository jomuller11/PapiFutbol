'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { advanceBracketWinner } from '@/lib/actions/brackets';
import { updateMatchPenalties } from '@/lib/utils/match-notes';

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Round-robin helpers
// ─────────────────────────────────────────────────────────────────────────────

function roundRobin(teams: string[]): Array<Array<[string, string]>> {
  const arr = teams.length % 2 === 0 ? [...teams] : [...teams, '__bye__'];
  const n = arr.length;
  const rounds: Array<Array<[string, string]>> = [];

  for (let r = 0; r < n - 1; r++) {
    const round: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== '__bye__' && b !== '__bye__') {
        round.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    rounds.push(round);
    // Rotate keeping arr[0] fixed
    arr.splice(1, 0, arr.pop()!);
  }
  return rounds;
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

// ─────────────────────────────────────────────────────────────────────────────
// generateGroupFixture
// ─────────────────────────────────────────────────────────────────────────────

export async function generateGroupFixture(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const groupId = formData.get('group_id') as string;
  const startDate = formData.get('start_date') as string;
  const doubleRound = formData.get('double_round_robin') === 'true';

  if (!z.string().uuid().safeParse(groupId).success) {
    return { success: false, error: 'Zona inválida.' };
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { success: false, error: 'Fecha de inicio inválida.' };
  }

  // Fetch group → phase → tournament
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, phase_id')
    .eq('id', groupId)
    .single();
  if (!group) return { success: false, error: 'Zona no encontrada.' };

  const { data: phase } = await supabase
    .from('phases')
    .select('id, tournament_id')
    .eq('id', (group as any).phase_id)
    .single();
  if (!phase) return { success: false, error: 'Fase no encontrada.' };

  const phaseId = (phase as any).id;
  const tournamentId = (phase as any).tournament_id;

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('fields_count, time_slots')
    .eq('id', tournamentId)
    .single();
  if (!tournament) return { success: false, error: 'Torneo no encontrado.' };

  const fieldsCount: number = (tournament as any).fields_count ?? 4;
  const timeSlots: string[] = (tournament as any).time_slots ?? ['10:00', '11:30', '13:00'];

  // Get teams in group
  const { data: groupTeams } = await supabase
    .from('group_teams')
    .select('team_id')
    .eq('group_id', groupId);

  const teamIds = ((groupTeams as any[]) ?? []).map((gt: any) => gt.team_id as string);
  if (teamIds.length < 2) {
    return { success: false, error: 'La zona necesita al menos 2 equipos.' };
  }

  // Block if played matches exist
  const { count: playedCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'played');

  if (playedCount && playedCount > 0) {
    return {
      success: false,
      error: `No se puede regenerar: hay ${playedCount} partido(s) ya jugado(s) en esta zona.`,
    };
  }

  // Delete existing scheduled matches
  await (supabase.from('matches') as any).delete().eq('group_id', groupId).neq('status', 'played');

  // Build pairings
  const baseRounds = roundRobin(teamIds);
  const allRounds = doubleRound
    ? [...baseRounds, ...baseRounds.map(r => r.map(([h, a]) => [a, h] as [string, string]))]
    : baseRounds;

  const inserts = allRounds.flatMap((round, rIdx) =>
    round.map(([homeId, awayId], mIdx) => ({
      tournament_id: tournamentId,
      phase_id: phaseId,
      group_id: groupId,
      round_number: rIdx + 1,
      match_date: addDays(startDate, rIdx * 7),
      home_team_id: homeId,
      away_team_id: awayId,
      status: 'scheduled',
      ...assignSlot(mIdx, fieldsCount, timeSlots),
    }))
  );

  if (inserts.length === 0) return { success: false, error: 'No se pudieron generar partidos.' };

  const { error } = await (supabase.from('matches') as any).insert(inserts);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/fixture');
  revalidatePath('/fixture');
  revalidatePath('/');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateMatchDetails
// ─────────────────────────────────────────────────────────────────────────────

export async function updateMatchDetails(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const matchId = formData.get('match_id') as string;
  if (!z.string().uuid().safeParse(matchId).success) {
    return { success: false, error: 'Partido inválido.' };
  }

  const parsed = z.object({
    match_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    match_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    field_number: z.coerce.number().int().min(1).max(10),
    observer_team_id: z.string().uuid().nullable().optional(),
  }).safeParse({
    match_date: formData.get('match_date'),
    match_time: formData.get('match_time'),
    field_number: formData.get('field_number'),
    observer_team_id: formData.get('observer_team_id') || null,
  });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos: ' + parsed.error.issues[0]?.message };
  }

  const { error } = await (supabase.from('matches') as any)
    .update(parsed.data)
    .eq('id', matchId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/fixture');
  revalidatePath(`/admin/fixture/${matchId}`);
  revalidatePath('/fixture');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// saveMatchResult
// ─────────────────────────────────────────────────────────────────────────────

export async function saveMatchResult(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const matchId = formData.get('match_id') as string;
  if (!z.string().uuid().safeParse(matchId).success) {
    return { success: false, error: 'Partido inválido.' };
  }

  const parsed = z.object({
    home_score: z.coerce.number().int().min(0).max(99),
    away_score: z.coerce.number().int().min(0).max(99),
    penalty_home: z.union([z.coerce.number().int().min(0).max(99), z.literal('')]).optional(),
    penalty_away: z.union([z.coerce.number().int().min(0).max(99), z.literal('')]).optional(),
  }).safeParse({
    home_score: formData.get('home_score'),
    away_score: formData.get('away_score'),
    penalty_home: formData.get('penalty_home'),
    penalty_away: formData.get('penalty_away'),
  });

  if (!parsed.success) return { success: false, error: 'Resultado inválido.' };

  const { data: matchInfo } = await supabase
    .from('matches')
    .select('bracket_id, notes')
    .eq('id', matchId)
    .single();

  const penaltyHome =
    parsed.data.penalty_home === '' || parsed.data.penalty_home === undefined
      ? null
      : parsed.data.penalty_home;
  const penaltyAway =
    parsed.data.penalty_away === '' || parsed.data.penalty_away === undefined
      ? null
      : parsed.data.penalty_away;

  if ((penaltyHome === null) !== (penaltyAway === null)) {
    return { success: false, error: 'CargÃ¡ ambos resultados de penales.' };
  }

  if ((penaltyHome !== null || penaltyAway !== null) && parsed.data.home_score !== parsed.data.away_score) {
    return { success: false, error: 'Solo podÃ©s cargar penales si el partido terminÃ³ empatado.' };
  }

  const { error } = await (supabase.from('matches') as any)
    .update({
      home_score: parsed.data.home_score,
      away_score: parsed.data.away_score,
      notes: updateMatchPenalties(
        (matchInfo as any)?.notes ?? null,
        penaltyHome !== null && penaltyAway !== null ? { home: penaltyHome, away: penaltyAway } : null
      ),
      status: 'played',
    })
    .eq('id', matchId);

  if (error) return { success: false, error: error.message };

  if ((matchInfo as any)?.bracket_id) {
    await advanceBracketWinner(matchId);
  }

  revalidatePath('/admin/fixture');
  revalidatePath(`/admin/fixture/${matchId}`);
  revalidatePath('/fixture');
  revalidatePath('/');
  revalidatePath('/standings');
  revalidatePath('/scorers');
  revalidatePath('/fair-play');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// reopenMatch
// ─────────────────────────────────────────────────────────────────────────────

export async function reopenMatch(matchId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(matchId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  const { data: matchInfo } = await supabase
    .from('matches')
    .select('notes')
    .eq('id', matchId)
    .single();

  const { error } = await (supabase.from('matches') as any)
    .update({
      status: 'scheduled',
      home_score: null,
      away_score: null,
      notes: updateMatchPenalties((matchInfo as any)?.notes ?? null, null),
    })
    .eq('id', matchId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/fixture');
  revalidatePath(`/admin/fixture/${matchId}`);
  revalidatePath('/fixture');
  revalidatePath('/');
  revalidatePath('/standings');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// addMatchGoal
// ─────────────────────────────────────────────────────────────────────────────

export async function addMatchGoal(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const parsed = z.object({
    match_id: z.string().uuid(),
    player_id: z.string().uuid(),
    team_id: z.string().uuid(),
    minute: z.coerce.number().int().min(1).max(120).nullable().optional(),
    is_own_goal: z.coerce.boolean().optional(),
  }).safeParse({
    match_id: formData.get('match_id'),
    player_id: formData.get('player_id'),
    team_id: formData.get('team_id'),
    minute: formData.get('minute') || null,
    is_own_goal: formData.get('is_own_goal') === 'true',
  });

  if (!parsed.success) return { success: false, error: 'Datos inválidos.' };

  const { match_id, player_id, team_id, minute, is_own_goal } = parsed.data;

  // Verify the team is in the match
  const { data: match } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id')
    .eq('id', match_id)
    .single();

  if (!match) return { success: false, error: 'Partido no encontrado.' };
  if (
    (match as any).home_team_id !== team_id &&
    (match as any).away_team_id !== team_id
  ) {
    return { success: false, error: 'El equipo no participa en este partido.' };
  }

  const { error } = await (supabase.from('match_goals') as any).insert({
    match_id,
    player_id,
    team_id,
    minute: minute ?? null,
    is_own_goal: is_own_goal ?? false,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/fixture/${match_id}`);
  revalidatePath('/scorers');
  revalidatePath('/');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// removeMatchGoal
// ─────────────────────────────────────────────────────────────────────────────

export async function removeMatchGoal(goalId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(goalId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  // Get match_id before deleting for revalidation
  const { data: goal } = await supabase
    .from('match_goals')
    .select('match_id')
    .eq('id', goalId)
    .single();

  const { error } = await (supabase.from('match_goals') as any).delete().eq('id', goalId);
  if (error) return { success: false, error: error.message };

  if (goal) revalidatePath(`/admin/fixture/${(goal as any).match_id}`);
  revalidatePath('/scorers');
  revalidatePath('/');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// addMatchCard
// ─────────────────────────────────────────────────────────────────────────────

export async function addMatchCard(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const parsed = z.object({
    match_id: z.string().uuid(),
    player_id: z.string().uuid(),
    team_id: z.string().uuid(),
    type: z.enum(['yellow', 'red', 'blue']),
    minute: z.coerce.number().int().min(1).max(120).nullable().optional(),
  }).safeParse({
    match_id: formData.get('match_id'),
    player_id: formData.get('player_id'),
    team_id: formData.get('team_id'),
    type: formData.get('type'),
    minute: formData.get('minute') || null,
  });

  if (!parsed.success) return { success: false, error: 'Datos inválidos.' };

  const { match_id, player_id, team_id, type, minute } = parsed.data;

  const { data: match } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id')
    .eq('id', match_id)
    .single();

  if (!match) return { success: false, error: 'Partido no encontrado.' };
  if (
    (match as any).home_team_id !== team_id &&
    (match as any).away_team_id !== team_id
  ) {
    return { success: false, error: 'El equipo no participa en este partido.' };
  }

  const { error } = await (supabase.from('match_cards') as any).insert({
    match_id,
    player_id,
    team_id,
    type,
    minute: minute ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/fixture/${match_id}`);
  revalidatePath('/fair-play');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// removeMatchCard
// ─────────────────────────────────────────────────────────────────────────────

export async function removeMatchCard(cardId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(cardId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  const { data: card } = await supabase
    .from('match_cards')
    .select('match_id')
    .eq('id', cardId)
    .single();

  const { error } = await (supabase.from('match_cards') as any).delete().eq('id', cardId);
  if (error) return { success: false, error: error.message };

  if (card) revalidatePath(`/admin/fixture/${(card as any).match_id}`);
  revalidatePath('/fair-play');
  return { success: true };
}
