'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updatePlayerScore(playerId: string, score: number) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return { success: false, error: 'Forbidden' };
  }

  const { error } = await supabase
    .from('players')
    .update({ score })
    .eq('id', playerId);

  if (error) {
    console.error('Error updating player score:', error);
    return { success: false, error: 'Failed to update score' };
  }

  revalidatePath('/admin/players');
  return { success: true };
}
