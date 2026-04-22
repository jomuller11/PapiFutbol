'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role !== 'admin' && (profile as any)?.role !== 'staff') {
    redirect('/dashboard');
  }

  return { supabase, userId: user.id, role: (profile as any).role };
}

// ─────────────────────────────────────────────────────────────────────────────
// createTournament
// ─────────────────────────────────────────────────────────────────────────────

const CreateTournamentSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(60),
  year: z.coerce.number().int().min(2024, 'El año debe ser 2024 o posterior').max(2050),
  fields_count: z.coerce.number().int().min(1).max(10),
  players_per_team: z.coerce.number().int().min(5).max(15),
  max_teams: z.coerce.number().int().min(2).max(24),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  time_slots: z.string().min(1, 'Ingresá al menos un horario'),
});

export async function createTournament(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireAdmin();

  const raw = {
    name: formData.get('name'),
    year: formData.get('year'),
    fields_count: formData.get('fields_count'),
    players_per_team: formData.get('players_per_team'),
    max_teams: formData.get('max_teams'),
    start_date: formData.get('start_date') || undefined,
    end_date: formData.get('end_date') || undefined,
    time_slots: formData.get('time_slots'),
  };

  const parsed = CreateTournamentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, year, fields_count, players_per_team, max_teams, start_date, end_date, time_slots } =
    parsed.data;

  const slots = time_slots
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const { data, error } = await (supabase
    .from('tournaments') as any)
    .insert({
      name,
      year,
      fields_count,
      players_per_team,
      max_teams,
      start_date: start_date || null,
      end_date: end_date || null,
      time_slots: slots,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23P01') {
      return { success: false, error: `Ya existe un torneo activo para el año ${year}.` };
    }
    return { success: false, error: `Error al crear el torneo: ${error.message}` };
  }

  revalidatePath('/admin/tournament');
  return { success: true, data: { id: (data as any).id } };
}

// ─────────────────────────────────────────────────────────────────────────────
// setTournamentStatus
// ─────────────────────────────────────────────────────────────────────────────

const SetStatusSchema = z.object({
  tournamentId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'finished', 'cancelled']),
});

export async function setTournamentStatus(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const parsed = SetStatusSchema.safeParse({
    tournamentId: formData.get('tournamentId'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' };
  }

  const { tournamentId, status } = parsed.data;

  const { error } = await (supabase
    .from('tournaments') as any)
    .update({ status })
    .eq('id', tournamentId);

  if (error) {
    if (error.code === '23P01') {
      return { success: false, error: 'Ya existe un torneo activo este año. Cerralo primero.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/tournament');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateTimeSlots
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTimeSlots(
  tournamentId: string,
  slots: string[]
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const { error } = await (supabase
    .from('tournaments') as any)
    .update({ time_slots: slots })
    .eq('id', tournamentId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/tournament');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASES — CRUD
// ─────────────────────────────────────────────────────────────────────────────

const PhaseInputSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  type: z.enum(['groups', 'bracket']),
  order: z.coerce.number().int().min(1).max(20),
});

export async function createPhase(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const parsed = z
    .object({ tournamentId: z.string().uuid() })
    .and(PhaseInputSchema)
    .safeParse({
      tournamentId: formData.get('tournamentId'),
      name: formData.get('name'),
      type: formData.get('type'),
      order: formData.get('order'),
    });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { tournamentId, name, type, order } = parsed.data;

  const { error } = await (supabase.from('phases') as any).insert({
    tournament_id: tournamentId,
    name,
    type,
    order,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe una fase con ese orden en este torneo.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/tournament');
  return { success: true };
}

export async function updatePhase(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const parsed = z
    .object({ phaseId: z.string().uuid() })
    .and(PhaseInputSchema)
    .safeParse({
      phaseId: formData.get('phaseId'),
      name: formData.get('name'),
      type: formData.get('type'),
      order: formData.get('order'),
    });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { phaseId, name, type, order } = parsed.data;

  // Si la fase ya tiene partidos jugados, bloqueamos cambiar el type
  // (un cambio groups↔bracket rompería la integridad de los matches).
  const { data: existing } = await supabase
    .from('phases')
    .select('type, status')
    .eq('id', phaseId)
    .single();

  if (!existing) {
    return { success: false, error: 'La fase no existe.' };
  }

  if ((existing as any).type !== type && (existing as any).status !== 'pending') {
    return {
      success: false,
      error: 'No podés cambiar el tipo de una fase que ya comenzó.',
    };
  }

  const { error } = await (supabase
    .from('phases') as any)
    .update({ name, type, order })
    .eq('id', phaseId);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe otra fase con ese orden.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/tournament');
  return { success: true };
}

export async function deletePhase(phaseId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  if (!z.string().uuid().safeParse(phaseId).success) {
    return { success: false, error: 'ID inválido' };
  }

  // No permitir borrar si tiene partidos jugados
  const { count: playedCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('phase_id', phaseId)
    .eq('status', 'played');

  if (playedCount && playedCount > 0) {
    return {
      success: false,
      error: `No podés borrar esta fase: ya tiene ${playedCount} partido(s) jugado(s).`,
    };
  }

  const { error } = await (supabase.from('phases') as any).delete().eq('id', phaseId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/tournament');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS (zonas) — CRUD
// ─────────────────────────────────────────────────────────────────────────────

const GroupInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Requerido')
    .max(20, 'Máximo 20 caracteres'),
});

export async function createGroup(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const parsed = z
    .object({ phaseId: z.string().uuid() })
    .and(GroupInputSchema)
    .safeParse({
      phaseId: formData.get('phaseId'),
      name: formData.get('name'),
    });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { phaseId, name } = parsed.data;

  // Verificar que la fase es de tipo groups
  const { data: phase } = await supabase
    .from('phases')
    .select('type')
    .eq('id', phaseId)
    .single();

  if (!phase) return { success: false, error: 'La fase no existe.' };
  if ((phase as any).type !== 'groups') {
    return { success: false, error: 'Solo se pueden crear zonas en fases de tipo "grupos".' };
  }

  // Calcular el order automáticamente (siguiente en la lista)
  const { count } = await supabase
    .from('groups')
    .select('id', { count: 'exact', head: true })
    .eq('phase_id', phaseId);

  const nextOrder = (count ?? 0) + 1;

  const { error } = await (supabase.from('groups') as any).insert({
    phase_id: phaseId,
    name,
    order: nextOrder,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `Ya existe una zona con el nombre "${name}" en esta fase.` };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/tournament');
  return { success: true };
}

export async function updateGroup(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const parsed = z
    .object({ groupId: z.string().uuid() })
    .and(GroupInputSchema)
    .safeParse({
      groupId: formData.get('groupId'),
      name: formData.get('name'),
    });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { groupId, name } = parsed.data;

  const { error } = await (supabase
    .from('groups') as any)
    .update({ name })
    .eq('id', groupId);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe otra zona con ese nombre en la fase.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/tournament');
  return { success: true };
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  if (!z.string().uuid().safeParse(groupId).success) {
    return { success: false, error: 'ID inválido' };
  }

  // Bloquear si hay partidos en la zona
  const { count: matchCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (matchCount && matchCount > 0) {
    return {
      success: false,
      error: `No podés borrar esta zona: ya tiene ${matchCount} partido(s) programado(s).`,
    };
  }

  // Bloquear si hay equipos asignados (avisar al admin que los saque primero)
  const { count: teamCount } = await supabase
    .from('group_teams')
    .select('team_id', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (teamCount && teamCount > 0) {
    return {
      success: false,
      error: `Sacá los ${teamCount} equipo(s) asignado(s) antes de borrar la zona.`,
    };
  }

  const { error } = await (supabase.from('groups') as any).delete().eq('id', groupId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/tournament');
  return { success: true };
}
