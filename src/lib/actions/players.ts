'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
// import type { PlayerReference, PlayerPosition, PlayerFoot } from '@/types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'No autorizado', supabase, user: null };
  return { ok: true as const, supabase, user };
}

export type PlayerActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  playerId?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1-2: completePlayerProfile
// Crea el registro players con todos los datos personales y futbolísticos.
// Si ya existe, hace update (permite editar durante el onboarding).
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE_SCHEMA = z.object({
  firstName: z.string().trim().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().trim().min(2, 'Mínimo 2 caracteres'),
  nickname: z.string().trim().max(30, 'Máximo 30 caracteres').optional().nullable(),
  dni: z.string().trim().regex(/^[\d.]+$/, 'Solo números y puntos').min(7, 'DNI inválido'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  phone: z.string().trim().min(8, 'Teléfono inválido'),
  reference: z.enum([
    'padre_alumno', 'padre_ex_alumno', 'ex_alumno', 'docente_colegio',
    'invitado', 'hermano_marista', 'esposo_educadora', 'abuelo_alumno',
  ]),
  position: z.enum(['ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL']),
  foot: z.enum(['derecho', 'izquierdo', 'ambidiestro']),
});

export type ProfileInput = z.infer<typeof PROFILE_SCHEMA>;

export async function completePlayerProfile(input: ProfileInput): Promise<PlayerActionResult> {
  const parsed = PROFILE_SCHEMA.safeParse(input);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const d = parsed.data;

  // Chequeo: ¿ya existe un player asociado al profile?
  const { data: existing } = await auth.supabase
    .from('players')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  const payload = {
    profile_id: auth.user.id,
    first_name: d.firstName,
    last_name: d.lastName,
    nickname: d.nickname ?? null,
    dni: d.dni,
    birth_date: d.birthDate,
    phone: d.phone,
    reference: d.reference as any,
    position: d.position as any,
    foot: d.foot as any,
  };

  let playerId: string;

  if (existing) {
    const { error } = await (auth.supabase
      .from('players') as any)
      .update(payload)
      .eq('id', (existing as any).id);
    if (error) {
      if (error.code === '23505') return { success: false, error: 'Ya existe otro jugador con ese DNI.' };
      console.error('updatePlayer error', error);
      return { success: false, error: 'No pudimos guardar tu perfil.' };
    }
    playerId = (existing as any).id;
  } else {
    const { data: inserted, error } = await (auth.supabase
      .from('players') as any)
      .insert(payload)
      .select('id')
      .single();
    if (error || !inserted) {
      if (error?.code === '23505') return { success: false, error: 'Ya existe otro jugador con ese DNI.' };
      console.error('insertPlayer error', error);
      return { success: false, error: 'No pudimos guardar tu perfil.' };
    }
    playerId = inserted.id;
  }

  revalidatePath('/onboarding');
  revalidatePath('/profile');
  return { success: true, playerId };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: uploadAvatar — sube foto al bucket 'avatars' y setea players.avatar_url.
// La ruta es: avatars/{profile_id}/avatar-{timestamp}.{ext}
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadAvatar(formData: FormData): Promise<PlayerActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const file = formData.get('file') as File | null;
  if (!file) return { success: false, error: 'No seleccionaste un archivo.' };
  if (file.size > 5 * 1024 * 1024) return { success: false, error: 'Máximo 5MB.' };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { success: false, error: 'Solo JPG, PNG o WEBP.' };
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = `${auth.user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await auth.supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    console.error('uploadAvatar error', uploadError);
    return { success: false, error: 'No pudimos subir la foto.' };
  }

  const { data: publicUrl } = auth.supabase.storage.from('avatars').getPublicUrl(path);

  const { error: updateError } = await (auth.supabase
    .from('players') as any)
    .update({ avatar_url: publicUrl.publicUrl })
    .eq('profile_id', auth.user.id);

  if (updateError) {
    console.error('updateAvatarUrl error', updateError);
    return { success: false, error: 'Subimos la foto pero no pudimos asociarla al perfil.' };
  }

  revalidatePath('/onboarding');
  revalidatePath('/profile');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: requestTournamentRegistration
// Crea la inscripción en estado 'pending' al torneo activo.
// ─────────────────────────────────────────────────────────────────────────────

export async function requestTournamentRegistration(): Promise<PlayerActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  // 1. Jugador
  const { data: player } = await auth.supabase
    .from('players')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  if (!player) {
    return { success: false, error: 'Primero completá tu perfil.' };
  }

  // 2. Torneo activo
  const { data: tournament } = await auth.supabase
    .from('tournaments')
    .select('id, name')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return { success: false, error: 'No hay un torneo activo en este momento.' };
  }

  // 3. Chequear si ya tiene inscripción
  const { data: existing } = await auth.supabase
    .from('player_tournament_registrations')
    .select('id, status')
    .eq('player_id', (player as any).id)
    .eq('tournament_id', (tournament as any).id)
    .maybeSingle();

  if (existing) {
    if ((existing as any).status === 'pending') {
      return { success: false, error: 'Ya enviaste tu solicitud, está pendiente de revisión.' };
    }
    if ((existing as any).status === 'approved') {
      return { success: false, error: 'Ya estás inscripto al torneo.' };
    }
    if ((existing as any).status === 'waitlist') {
      return { success: false, error: 'Estás en lista de espera para este torneo.' };
    }
    // Si estaba 'rejected', permitimos volver a intentar: re-seteamos a pending.
    const { error } = await (auth.supabase
      .from('player_tournament_registrations') as any)
      .update({
        status: 'pending',
        requested_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
      })
      .eq('id', (existing as any).id);
    if (error) {
      console.error('reRequestRegistration error', error);
      return { success: false, error: 'No pudimos reenviar tu solicitud.' };
    }
  } else {
    const { error } = await (auth.supabase
      .from('player_tournament_registrations') as any)
      .insert({
        player_id: (player as any).id,
        tournament_id: (tournament as any).id,
        status: 'pending',
      });
    if (error) {
      console.error('insertRegistration error', error);
      return { success: false, error: 'No pudimos enviar tu solicitud.' };
    }
  }

  revalidatePath('/onboarding');
  revalidatePath('/dashboard');
  revalidatePath('/admin/approvals');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelTournamentRegistration — el jugador puede cancelar mientras esté pending.
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelTournamentRegistration(): Promise<PlayerActionResult> {
  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: player } = await auth.supabase
    .from('players')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  if (!player) return { success: false, error: 'Jugador no encontrado.' };
  const playerId = (player as any).id;

  const { data: tournament } = await auth.supabase
    .from('tournaments')
    .select('id')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) return { success: false, error: 'No hay torneo activo.' };

  const { data: reg } = await auth.supabase
    .from('player_tournament_registrations')
    .select('id, status')
    .eq('player_id', (player as any).id)
    .eq('tournament_id', (tournament as any).id)
    .maybeSingle();

  if (!reg) return { success: false, error: 'No tenés una inscripción pendiente.' };
  if ((reg as any).status !== 'pending') {
    return { success: false, error: 'Solo podés cancelar mientras la inscripción esté pendiente.' };
  }

  const { error } = await (auth.supabase
    .from('player_tournament_registrations') as any)
    .delete()
    .eq('id', (reg as any).id);

  if (error) {
    console.error('cancelRegistration error', error);
    return { success: false, error: 'No pudimos cancelar.' };
  }

  revalidatePath('/onboarding');
  revalidatePath('/dashboard');
  revalidatePath('/admin/approvals');
  return { success: true };
}
