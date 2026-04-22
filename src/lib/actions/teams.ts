'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { VALID_COLORS } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

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

  if ((profile as any)?.role !== 'admin' && (profile as any)?.role !== 'staff') {
    redirect('/dashboard');
  }

  return { supabase, userId: user.id, role: (profile as any).role };
}

// ─────────────────────────────────────────────────────────────────────────────
// createTeam
// ─────────────────────────────────────────────────────────────────────────────

const TeamInputSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60'),
  short_name: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(4, 'Máximo 4 caracteres')
    .regex(/^[A-Z0-9]+$/i, 'Solo letras y números')
    .transform(s => s.toUpperCase()),
  color: z
    .string()
    .refine(c => VALID_COLORS.includes(c as any), 'Color inválido'),
  group_id: z.string().uuid().nullable().optional(),
});

export async function createTeam(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireStaffOrAdmin();

  const tournamentId = formData.get('tournament_id') as string | null;
  if (!tournamentId || !z.string().uuid().safeParse(tournamentId).success) {
    return { success: false, error: 'Torneo inválido' };
  }

  const parsed = TeamInputSchema.safeParse({
    name: formData.get('name'),
    short_name: formData.get('short_name'),
    color: formData.get('color'),
    group_id: formData.get('group_id') || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, short_name, color, group_id } = parsed.data;

  // Insertar equipo
  const { data: team, error } = await (supabase
    .from('teams') as any)
    .insert({
      tournament_id: tournamentId,
      name,
      short_name,
      color,
    })
    .select('id')
    .single();

  if (error || !team) {
    if (error?.code === '23505') {
      return { success: false, error: `Ya existe un equipo llamado "${name}" en este torneo.` };
    }
    return { success: false, error: error?.message ?? 'No pudimos crear el equipo.' };
  }

  // Si se eligió zona, asignarlo a la zona
  if (group_id) {
    const { error: groupError } = await (supabase
      .from('group_teams') as any)
      .insert({ group_id, team_id: team.id });

    if (groupError) {
      console.error('assignToGroup error', groupError);
      // No revertimos la creación del equipo, solo avisamos
      return {
        success: true,
        data: { id: (team as any).id },
      };
    }
  }

  revalidatePath('/admin/teams');
  return { success: true, data: { id: team.id } };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateTeam
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTeam(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const teamId = formData.get('team_id') as string | null;
  if (!teamId || !z.string().uuid().safeParse(teamId).success) {
    return { success: false, error: 'Equipo inválido' };
  }

  const parsed = TeamInputSchema.safeParse({
    name: formData.get('name'),
    short_name: formData.get('short_name'),
    color: formData.get('color'),
    group_id: formData.get('group_id') || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, short_name, color, group_id } = parsed.data;

  // Actualizar datos del equipo
  const { error: teamError } = await (supabase
    .from('teams') as any)
    .update({ name, short_name, color })
    .eq('id', teamId);

  if (teamError) {
    if (teamError.code === '23505') {
      return { success: false, error: `Ya existe otro equipo llamado "${name}".` };
    }
    return { success: false, error: teamError.message };
  }

  // Gestionar zona: borrar asignación actual y crear nueva si corresponde
  // Nota: un equipo puede estar en múltiples grupos (en distintas fases),
  // pero acá solo gestionamos la actual. El sorteo puede agregar más después.
  const { data: existingGroups } = await supabase
    .from('group_teams')
    .select('group_id')
    .eq('team_id', teamId);

  const currentGroupIds = ((existingGroups as any[]) ?? []).map(g => g.group_id);

  if (group_id && !currentGroupIds.includes(group_id)) {
    // Si cambia la zona, primero borramos las asignaciones en grupos de la misma fase
    if (currentGroupIds.length > 0) {
      // Verificar si hay partidos: no se puede cambiar si hay partidos jugados
      const { count: playedCount } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'played')
        .in('group_id', currentGroupIds);

      if (playedCount && playedCount > 0) {
        return {
          success: false,
          error: 'No podés cambiar la zona: el equipo ya tiene partidos jugados.',
        };
      }

      // Obtener phase_id del grupo nuevo para borrar solo los viejos de esa fase
      const { data: newGroup } = await supabase
        .from('groups')
        .select('phase_id')
        .eq('id', group_id)
        .single();

      if (newGroup) {
        const { data: sameFaseGroups } = await supabase
          .from('groups')
          .select('id')
          .eq('phase_id', (newGroup as any).phase_id);

        const sameFaseIds = ((sameFaseGroups as any[]) ?? []).map(g => g.id);

        await (supabase
          .from('group_teams') as any)
          .delete()
          .eq('team_id', teamId)
          .in('group_id', sameFaseIds);
      }
    }

    // Insertar nueva asignación
    const { error: insertError } = await (supabase
      .from('group_teams') as any)
      .insert({ group_id, team_id: teamId });

    if (insertError) {
      return { success: false, error: 'No pudimos cambiar la zona: ' + insertError.message };
    }
  } else if (!group_id && currentGroupIds.length > 0) {
    // Si se quitó la zona (se puso null), borrar todas las asignaciones
    // Pero verificar partidos primero
    const { count: playedCount } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'played')
      .in('group_id', currentGroupIds);

    if (playedCount && playedCount > 0) {
      return {
        success: false,
        error: 'No podés quitar la zona: el equipo tiene partidos jugados.',
      };
    }

    await (supabase.from('group_teams') as any).delete().eq('team_id', teamId);
  }

  revalidatePath('/admin/teams');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteTeam
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteTeam(teamId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(teamId).success) {
    return { success: false, error: 'ID inválido' };
  }

  // Bloquear si tiene partidos jugados
  const { count: matchCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'played');

  if (matchCount && matchCount > 0) {
    return {
      success: false,
      error: `No podés borrar este equipo: tiene ${matchCount} partido(s) jugado(s).`,
    };
  }

  // Borrar (cascada se encarga de group_teams, team_memberships, matches scheduled)
  const { error } = await (supabase.from('teams') as any).delete().eq('id', teamId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/teams');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadTeamLogo
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadTeamLogo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const { supabase } = await requireStaffOrAdmin();

  const teamId = formData.get('team_id') as string | null;
  if (!teamId || !z.string().uuid().safeParse(teamId).success) {
    return { success: false, error: 'Equipo inválido' };
  }

  const file = formData.get('file') as File | null;
  if (!file) return { success: false, error: 'No seleccionaste un archivo.' };
  if (file.size > 2 * 1024 * 1024) return { success: false, error: 'Máximo 2MB.' };
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    return { success: false, error: 'Solo JPG, PNG, WEBP o SVG.' };
  }

  const ext = file.type === 'image/jpeg'
    ? 'jpg'
    : file.type === 'image/png'
    ? 'png'
    : file.type === 'image/svg+xml'
    ? 'svg'
    : 'webp';
  const path = `${teamId}/logo-${Date.now()}.${ext}`;

  // Subimos al bucket 'team-logos'. Si no existe, este error va a aparecer
  // y te damos el mensaje explícito para que lo crees.
  const { error: uploadError } = await supabase.storage
    .from('team-logos')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    console.error('uploadTeamLogo error', uploadError);
    if (uploadError.message.toLowerCase().includes('bucket')) {
      return {
        success: false,
        error: 'Falta el bucket "team-logos" en Supabase Storage. Crealo como público con límite 2MB.',
      };
    }
    return { success: false, error: 'No pudimos subir el logo.' };
  }

  const { data: publicUrl } = supabase.storage.from('team-logos').getPublicUrl(path);

  const { error: updateError } = await (supabase
    .from('teams') as any)
    .update({ logo_url: publicUrl.publicUrl })
    .eq('id', teamId);

  if (updateError) {
    return {
      success: false,
      error: 'Subimos el logo pero no pudimos asociarlo al equipo: ' + updateError.message,
    };
  }

  revalidatePath('/admin/teams');
  return { success: true, data: { url: publicUrl.publicUrl } };
}

// ─────────────────────────────────────────────────────────────────────────────
// addTeamMember
// ─────────────────────────────────────────────────────────────────────────────

const MembershipSchema = z.object({
  team_id: z.string().uuid(),
  player_id: z.string().uuid(),
  jersey_number: z.coerce.number().int().min(1).max(99).nullable().optional(),
  is_captain: z.coerce.boolean().optional(),
});

export async function addTeamMember(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const parsed = MembershipSchema.safeParse({
    team_id: formData.get('team_id'),
    player_id: formData.get('player_id'),
    jersey_number: formData.get('jersey_number') || null,
    is_captain: formData.get('is_captain') === 'true',
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { team_id, player_id, jersey_number, is_captain } = parsed.data;

  // Verificar que el jugador esté aprobado en el torneo del equipo
  const { data: team } = await supabase
    .from('teams')
    .select('tournament_id')
    .eq('id', team_id)
    .single();

  if (!team) return { success: false, error: 'Equipo no encontrado.' };

  const { data: registration } = await supabase
    .from('player_tournament_registrations')
    .select('status')
    .eq('player_id', player_id)
    .eq('tournament_id', (team as any).tournament_id)
    .maybeSingle();

  if (!registration || (registration as any).status !== 'approved') {
    return {
      success: false,
      error: 'El jugador no está aprobado para este torneo.',
    };
  }

  // Verificar que el jugador no esté ya en otro equipo del mismo torneo
  const { data: existingInTournament } = await supabase
    .from('team_memberships')
    .select('id, team:teams!inner(tournament_id)')
    .eq('player_id', player_id);

  const conflictInTournament = (existingInTournament ?? []).find(
    (m: any) => m.team?.tournament_id === (team as any).tournament_id
  );

  if (conflictInTournament) {
    return {
      success: false,
      error: 'El jugador ya está en otro equipo de este torneo.',
    };
  }

  // Si se marca como capitán, destituir al capitán anterior
  if (is_captain) {
    await (supabase
      .from('team_memberships') as any)
      .update({ is_captain: false })
      .eq('team_id', team_id)
      .eq('is_captain', true);
  }

  const { error } = await (supabase.from('team_memberships') as any).insert({
    team_id,
    player_id,
    jersey_number: jersey_number ?? null,
    is_captain: is_captain ?? false,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'El jugador ya está en el plantel.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/teams');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// removeTeamMember
// ─────────────────────────────────────────────────────────────────────────────

export async function removeTeamMember(membershipId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!z.string().uuid().safeParse(membershipId).success) {
    return { success: false, error: 'ID inválido' };
  }

  const { error } = await (supabase
    .from('team_memberships') as any)
    .delete()
    .eq('id', membershipId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/teams');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// saveDraw — bulk-assign players to teams from the draw page
// ─────────────────────────────────────────────────────────────────────────────

export async function saveDraw(
  pairs: { playerId: string; teamId: string }[]
): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  if (!pairs.length) return { success: false, error: 'No hay jugadores para asignar.' };

  const uuids = z.string().uuid();
  const invalid = pairs.find(p => !uuids.safeParse(p.playerId).success || !uuids.safeParse(p.teamId).success);
  if (invalid) return { success: false, error: 'Datos inválidos en el sorteo.' };

  const inserts = pairs.map(p => ({
    team_id: p.teamId,
    player_id: p.playerId,
    jersey_number: null,
    is_captain: false,
  }));

  const { error } = await (supabase.from('team_memberships') as any).insert(inserts);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Algún jugador ya está asignado a un equipo.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/teams');
  revalidatePath('/admin/draw');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateTeamMember (capitán, número)
// ─────────────────────────────────────────────────────────────────────────────

const UpdateMembershipSchema = z.object({
  membership_id: z.string().uuid(),
  jersey_number: z.coerce.number().int().min(1).max(99).nullable().optional(),
  is_captain: z.coerce.boolean().optional(),
});

export async function updateTeamMember(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaffOrAdmin();

  const parsed = UpdateMembershipSchema.safeParse({
    membership_id: formData.get('membership_id'),
    jersey_number: formData.get('jersey_number') || null,
    is_captain: formData.get('is_captain') === 'true',
  });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' };
  }

  const { membership_id, jersey_number, is_captain } = parsed.data;

  // Si se marca como capitán, buscar el team_id y destituir al anterior
  if (is_captain) {
    const { data: current } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('id', membership_id)
      .single();

    if (current) {
      await (supabase
        .from('team_memberships') as any)
        .update({ is_captain: false })
        .eq('team_id', (current as any).team_id)
        .eq('is_captain', true)
        .neq('id', membership_id);
    }
  }

  const updates: Record<string, unknown> = {};
  if (jersey_number !== undefined) updates.jersey_number = jersey_number;
  if (is_captain !== undefined) updates.is_captain = is_captain;

  const { error } = await (supabase
    .from('team_memberships') as any)
    .update(updates)
    .eq('id', membership_id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/teams');
  return { success: true };
}
