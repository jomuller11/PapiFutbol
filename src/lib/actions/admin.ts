'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
// updatePlayerScore — asigna/modifica el puntaje 1-15 de un jugador.
// ─────────────────────────────────────────────────────────────────────────────

const ScoreSchema = z.object({
  playerId: z.string().uuid('ID inválido'),
  score: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1')
    .max(15, 'Máximo 15')
    .nullable(),
});

export async function updatePlayerScore(
  playerId: string,
  score: number | null
): Promise<ActionResult> {
  const parsed = ScoreSchema.safeParse({ playerId, score });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await requireStaffOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await (auth.supabase
    .from('players') as any)
    .update({ score: parsed.data.score })
    .eq('id', parsed.data.playerId);

  if (error) {
    console.error('updatePlayerScore error', error);
    return { success: false, error: 'No pudimos actualizar el puntaje.' };
  }

  revalidatePath('/admin/players');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// updatePlayerInfo — editar datos de un jugador aprobado.
// ─────────────────────────────────────────────────────────────────────────────

const UpdatePlayerSchema = z.object({
  playerId: z.string().uuid(),
  firstName: z.string().min(2, 'Nombre muy corto').optional(),
  lastName: z.string().min(2, 'Apellido muy corto').optional(),
  nickname: z.string().nullable().optional(),
  phone: z.string().min(8, 'Teléfono inválido').optional(),
  position: z.enum(['ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL']).optional(),
  foot: z.enum(['derecho', 'izquierdo', 'ambidiestro']).optional(),
  reference: z
    .enum([
      'padre_alumno',
      'padre_ex_alumno',
      'ex_alumno',
      'docente_colegio',
      'invitado',
      'hermano_marista',
      'esposo_educadora',
      'abuelo_alumno',
    ])
    .optional(),
});

export async function updatePlayerInfo(
  input: z.infer<typeof UpdatePlayerSchema>
): Promise<ActionResult> {
  const parsed = UpdatePlayerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await requireStaffOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { playerId, ...rest } = parsed.data;

  // Mapeo camelCase -> snake_case sólo de campos presentes
  const updates: Record<string, unknown> = {};
  if (rest.firstName !== undefined) updates.first_name = rest.firstName;
  if (rest.lastName !== undefined) updates.last_name = rest.lastName;
  if (rest.nickname !== undefined) updates.nickname = rest.nickname || null;
  if (rest.phone !== undefined) updates.phone = rest.phone;
  if (rest.position !== undefined) updates.position = rest.position;
  if (rest.foot !== undefined) updates.foot = rest.foot;
  if (rest.reference !== undefined) updates.reference = rest.reference;

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No hay cambios para guardar.' };
  }

  const { error } = await (auth.supabase.from('players') as any).update(updates).eq('id', playerId);

  if (error) {
    console.error('updatePlayerInfo error', error);
    return { success: false, error: 'No pudimos guardar los cambios.' };
  }

  revalidatePath('/admin/players');
  return { success: true };
}
