import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffClient } from './StaffClient';

export type StaffMember = {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  invited_by_email: string | null;
  expires_at: string;
  created_at: string;
};

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role !== 'admin') redirect('/admin/dashboard');

  const [staffRes, invitesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .in('role', ['admin', 'staff'])
      .order('role')
      .order('email'),

    supabase
      .from('staff_invitations')
      .select(`
        id, email, role, expires_at, created_at,
        invited_by_profile:profiles!staff_invitations_invited_by_fkey(email)
      `)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ]);

  const staff: StaffMember[] = ((staffRes.data as any[]) ?? []).map((s: any) => ({
    id: s.id,
    email: s.email,
    role: s.role,
    created_at: s.created_at,
  }));

  const invitations: PendingInvitation[] = ((invitesRes.data as any[]) ?? []).map((i: any) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    invited_by_email: i.invited_by_profile?.email ?? null,
    expires_at: i.expires_at,
    created_at: i.created_at,
  }));

  return (
    <StaffClient
      staff={staff}
      invitations={invitations}
      currentUserId={user.id}
    />
  );
}
