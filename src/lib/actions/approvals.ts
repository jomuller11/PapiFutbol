'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

async function requireStaffOrAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'No autorizado', supabase, user: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || ((profile as any).role !== 'admin' && (profile as any).role !== 'staff')) {
    return { ok: false as const, error: 'Sin permisos', supabase, user: null };
  }

  return { ok: true as const, supabase, user, role: (profile as any).role };
}

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// ─────────────────────────────────────────────────────────────────────────────
// approveRegistration — marca una inscripción como aprobada.
// ─────────────────────────────────────────────────────────────────────────────

const IdSchema = z.object({
  registrationId: z.string().uuid('ID inválido'),
});

export async function approveRegistration(registrationId: string): Promise<ActionResult> {
  const parsed = IdSchema.safeParse({ registrationId });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await requireStaffOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await (auth.supabase
    .from('player_tournament_registrations') as any)
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user!.id,
      rejection_reason: null,
    })
    .eq('id', parsed.data.registrationId);

  if (error) {
    console.error('approveRegistration error', error);
    return { success: false, error: 'No pudimos aprobar la inscripción.' };
  }

  revalidatePath('/admin/approvals');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// rejectRegistration — rechaza con motivo opcional.
// ─────────────────────────────────────────────────────────────────────────────

const RejectSchema = z.object({
  registrationId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function rejectRegistration(
  registrationId: string,
  reason?: string
): Promise<ActionResult> {
  const parsed = RejectSchema.safeParse({ registrationId, reason });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await requireStaffOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await (auth.supabase
    .from('player_tournament_registrations') as any)
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user!.id,
      rejection_reason: parsed.data.reason ?? null,
    })
    .eq('id', parsed.data.registrationId);

  if (error) {
    console.error('rejectRegistration error', error);
    return { success: false, error: 'No pudimos rechazar la inscripción.' };
  }

  revalidatePath('/admin/approvals');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// moveToWaitlist — pasa una inscripción a lista de espera.
// ─────────────────────────────────────────────────────────────────────────────

export async function moveToWaitlist(registrationId: string): Promise<ActionResult> {
  const parsed = IdSchema.safeParse({ registrationId });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await requireStaffOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await (auth.supabase
    .from('player_tournament_registrations') as any)
    .update({
      status: 'waitlist',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user!.id,
    })
    .eq('id', parsed.data.registrationId);

  if (error) {
    console.error('moveToWaitlist error', error);
    return { success: false, error: 'No pudimos mover a lista de espera.' };
  }

  revalidatePath('/admin/approvals');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// approveAllPending — aprueba TODAS las inscripciones pendientes de un torneo.
// Útil para agilizar cuando el admin ya revisó todo.
// ─────────────────────────────────────────────────────────────────────────────

const TournamentIdSchema = z.object({
  tournamentId: z.string().uuid(),
});

export async function approveAllPending(
  tournamentId: string
): Promise<ActionResult & { count?: number }> {
  const parsed = TournamentIdSchema.safeParse({ tournamentId });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await requireStaffOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await (auth.supabase
    .from('player_tournament_registrations') as any)
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user!.id,
    })
    .eq('tournament_id', parsed.data.tournamentId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.error('approveAllPending error', error);
    return { success: false, error: 'No pudimos aprobar todas las pendientes.' };
  }

  revalidatePath('/admin/approvals');
  revalidatePath('/admin/dashboard');
  return { success: true, count: data?.length ?? 0 };
}
