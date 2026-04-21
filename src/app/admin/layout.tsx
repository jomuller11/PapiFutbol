import { Sidebar } from '@/components/admin/Sidebar';
import { TopBar } from '@/components/admin/TopBar';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard de seguridad a nivel layout: además del middleware,
  // chequeamos el rol acá por defensa en profundidad.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      <Sidebar role={profile.role} />
      <div className="flex-1 min-h-screen flex flex-col">
        <TopBar userEmail={profile.email} role={profile.role} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
