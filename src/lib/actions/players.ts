'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { PlayerReference, PlayerPosition, PlayerFoot } from '@/types/database';

const OnboardingSchema = z.object({
  firstName: z.string().min(2, 'Nombre muy corto'),
  lastName: z.string().min(2, 'Apellido muy corto'),
  nickname: z.string().optional(),
  dni: z.string().min(7, 'DNI inválido'),
  birthDate: z.string().min(10, 'Fecha inválida'),
  phone: z.string().min(8, 'Teléfono inválido'),
  reference: z.enum([
    'padre_alumno',
    'padre_ex_alumno',
    'ex_alumno',
    'docente_colegio',
    'invitado',
    'hermano_marista',
    'esposo_educadora',
    'abuelo_alumno'
  ]),
  position: z.enum(['ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL']),
  foot: z.enum(['derecho', 'izquierdo', 'ambidiestro']),
  avatarUrl: z.string().optional(),
});

export type PlayerActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function completePlayerProfile(formData: FormData): Promise<PlayerActionResult> {
  const parsed = OnboardingSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    nickname: formData.get('nickname') || undefined,
    dni: formData.get('dni'),
    birthDate: formData.get('birthDate'),
    phone: formData.get('phone'),
    reference: formData.get('reference'),
    position: formData.get('position'),
    foot: formData.get('foot'),
    avatarUrl: formData.get('avatarUrl') || undefined,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autorizado' };
  }

  const { error } = await supabase.from('players').insert({
    profile_id: user.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    nickname: parsed.data.nickname || null,
    dni: parsed.data.dni,
    birth_date: parsed.data.birthDate,
    phone: parsed.data.phone,
    reference: parsed.data.reference as PlayerReference,
    position: parsed.data.position as PlayerPosition,
    foot: parsed.data.foot as PlayerFoot,
    avatar_url: parsed.data.avatarUrl || null,
  });

  if (error) {
    if (error.code === '23505') { // unique_violation
      return { success: false, error: 'Ya existe un jugador con este DNI.' };
    }
    console.error('Error insertando perfil:', error);
    return { success: false, error: 'Ocurrió un error al guardar tu perfil.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
