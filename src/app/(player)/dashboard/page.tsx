import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/actions/auth';
import { Trophy, LogOut } from 'lucide-react';

export default async function PlayerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue flex items-center justify-center relative">
              <Trophy className="w-5 h-5 text-white" strokeWidth={2} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold text-brand-blue">Liga.9</div>
              <div className="text-[10px] font-mono text-slate-500 tracking-widest">PANEL JUGADOR</div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 p-8">
          <h1 className="font-serif text-2xl font-bold mb-2">¡Estás logueado!</h1>
          <p className="text-sm text-slate-600 mb-6">
            Este es un placeholder del dashboard. Próximos pasos: implementar onboarding,
            perfil, partidos, estadísticas y notificaciones según los mockups.
          </p>

          <div className="bg-slate-50 border border-slate-100 p-4 font-mono text-xs">
            <div className="text-slate-500 mb-2">DATOS DE SESIÓN</div>
            <div>email: <span className="text-slate-900">{profile?.email}</span></div>
            <div>role: <span className="text-brand-orange">{profile?.role}</span></div>
            <div>id: <span className="text-slate-700 text-[10px]">{user.id}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
