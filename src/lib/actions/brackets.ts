'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export type BracketMatch = {
  id: string;
  round_number: number;
  bracket_position: number;
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

// ─── advanceBracketWinner ─────────────────────────────────────────────────────

export async function advanceBracketWinner(matchId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(matchId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id, bracket_id, round_number, bracket_position, home_team_id, away_team_id, home_score, away_score, status')
    .eq('id', matchId)
    .single();

  if (!match) return { success: false, error: 'Partido no encontrado.' };

  const m = match as any;
  if (!m.bracket_id) return { success: false, error: 'Este partido no pertenece a un bracket.' };
  if (m.status !== 'played') return { success: false, error: 'El partido aún no tiene resultado.' };
  if (m.home_score === null || m.away_score === null) return { success: false, error: 'Resultado incompleto.' };

  const winnerId: string = m.home_score >= m.away_score ? m.home_team_id : m.away_team_id;
  const nextRound = m.round_number + 1;
  const nextPosition = Math.ceil(m.bracket_position / 2);
  const isHome = m.bracket_position % 2 === 1;

  // Find next round's match
  const { data: nextMatch } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id')
    .eq('bracket_id', m.bracket_id)
    .eq('round_number', nextRound)
    .eq('bracket_position', nextPosition)
    .single();

  if (!nextMatch) {
    // No next match = this was the Final, nothing to advance
    return { success: true };
  }

  const update = isHome
    ? { home_team_id: winnerId }
    : { away_team_id: winnerId };

  const { error } = await (supabase.from('matches') as any)
    .update(update)
    .eq('id', (nextMatch as any).id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/admin/fixture');
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

export async function getBracketData(phaseId: string): Promise<BracketData | null> {
  const supabase = await createClient();

  const { data: bracket } = await supabase
    .from('brackets')
    .select('id, name, teams_count, phase_id')
    .eq('phase_id', phaseId)
    .maybeSingle();

  if (!bracket) return null;

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, round_number, bracket_position, home_team_id, away_team_id,
      home_score, away_score, status, match_date, match_time, field_number,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color)
    `)
    .eq('bracket_id', (bracket as any).id)
    .order('round_number', { ascending: true })
    .order('bracket_position', { ascending: true });

  const totalRounds = Math.log2((bracket as any).teams_count);
  const rounds: BracketMatch[][] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches = ((matches as any[]) ?? [])
      .filter((m: any) => m.round_number === r)
      .map((m: any) => ({
        ...m,
        home_team: Array.isArray(m.home_team) ? m.home_team[0] ?? null : m.home_team ?? null,
        away_team: Array.isArray(m.away_team) ? m.away_team[0] ?? null : m.away_team ?? null,
      }));
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

