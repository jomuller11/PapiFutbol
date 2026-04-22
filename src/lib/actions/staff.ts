'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Guard: solo admins
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

  if ((profile as any)?.role !== 'admin') redirect('/admin/dashboard');

  return { supabase, userId: user.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// inviteStaff
// ─────────────────────────────────────────────────────────────────────────────

export async function inviteStaff(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();

  const parsed = z.object({
    email: z.string().email('Email inválido').toLowerCase(),
    role: z.enum(['staff', 'admin']),
  }).safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const { email, role } = parsed.data;

  // Si ya tiene un profile, solo cambiarle el rol
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    if ((existing as any).role === 'admin' || (existing as any).role === 'staff') {
      return { success: false, error: 'Este usuario ya tiene acceso al panel.' };
    }
    // Es player → promover
    const { error } = await (supabase.from('profiles') as any)
      .update({ role })
      .eq('id', (existing as any).id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/staff');
    return { success: true };
  }

  // Usuario nuevo — verificar que no haya una invitación pendiente
  const { data: pendingInvite } = await supabase
    .from('staff_invitations')
    .select('id')
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (pendingInvite) {
    return { success: false, error: 'Ya hay una invitación pendiente para ese email.' };
  }

  // Crear registro de invitación (el trigger lo lee al registrarse)
  const { error: dbError } = await (supabase.from('staff_invitations') as any).insert({
    email,
    role,
    invited_by: userId,
  });

  if (dbError) return { success: false, error: dbError.message };

  // Enviar email de invitación vía Supabase Auth Admin API
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
  });

  if (authError) {
    // No bloqueamos el flujo si el email falla — la invitación está en la DB
    // y el usuario puede registrarse en /register con ese email.
    console.error('inviteUserByEmail error:', authError.message);
  }

  revalidatePath('/admin/staff');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateStaffRole
// ─────────────────────────────────────────────────────────────────────────────

export async function updateStaffRole(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();

  const parsed = z.object({
    profile_id: z.string().uuid(),
    role: z.enum(['staff', 'admin']),
  }).safeParse({
    profile_id: formData.get('profile_id'),
    role: formData.get('role'),
  });

  if (!parsed.success) return { success: false, error: 'Datos inválidos.' };

  // No puede cambiar su propio rol
  if (parsed.data.profile_id === userId) {
    return { success: false, error: 'No podés cambiar tu propio rol.' };
  }

  const { error } = await (supabase.from('profiles') as any)
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.profile_id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/staff');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// removeStaff — degrada al usuario a 'player'
// ─────────────────────────────────────────────────────────────────────────────

export async function removeStaff(profileId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();

  if (!z.string().uuid().safeParse(profileId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  if (profileId === userId) {
    return { success: false, error: 'No podés quitarte el acceso a vos mismo.' };
  }

  const { error } = await (supabase.from('profiles') as any)
    .update({ role: 'player' })
    .eq('id', profileId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/staff');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// revokeInvitation
// ─────────────────────────────────────────────────────────────────────────────

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  if (!z.string().uuid().safeParse(invitationId).success) {
    return { success: false, error: 'ID inválido.' };
  }

  const { error } = await (supabase.from('staff_invitations') as any)
    .delete()
    .eq('id', invitationId)
    .is('accepted_at', null);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/staff');
  return { success: true };
}
