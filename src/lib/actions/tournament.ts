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

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    redirect('/dashboard');
  }

  return { supabase, userId: user.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// createTournament
// ─────────────────────────────────────────────────────────────────────────────

const CreateTournamentSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(60),
  year: z.coerce
    .number()
    .int()
    .min(2024, 'El año debe ser 2024 o posterior')
    .max(2050),
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
    .map((s) => s.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from('tournaments')
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
  return { success: true, data: { id: data.id } };
}

// ─────────────────────────────────────────────────────────────────────────────
// setTournamentStatus
// ─────────────────────────────────────────────────────────────────────────────

const SetStatusSchema = z.object({
  tournamentId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'finished', 'cancelled']),
});

export async function setTournamentStatus(
  formData: FormData
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const parsed = SetStatusSchema.safeParse({
    tournamentId: formData.get('tournamentId'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' };
  }

  const { tournamentId, status } = parsed.data;

  const { error } = await supabase
    .from('tournaments')
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
// createPhase
// ─────────────────────────────────────────────────────────────────────────────

const CreatePhaseSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().min(2).max(60),
  type: z.enum(['groups', 'bracket']),
  order: z.coerce.number().int().min(1).max(20),
});

export async function createPhase(
  formData: FormData
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const parsed = CreatePhaseSchema.safeParse({
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

  const { error } = await supabase.from('phases').insert({
    tournament_id: tournamentId,
    name,
    type,
    order,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `Ya existe una fase con ese orden en este torneo.` };
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

  const { error } = await supabase
    .from('tournaments')
    .update({ time_slots: slots })
    .eq('id', tournamentId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/tournament');
  return { success: true };
}
