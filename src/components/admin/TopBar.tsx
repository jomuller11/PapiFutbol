'use client';

import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';

type Props = {
  userEmail: string;
  role: 'admin' | 'staff';
};

const titles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/tournament': 'Configuración de Torneo',
  '/admin/players': 'Jugadores',
  '/admin/approvals': 'Aprobación de Inscripciones',
  '/admin/draw': 'Sorteo de Equipos',
  '/admin/teams': 'Equipos',
  '/admin/fixture': 'Fixture',
  '/admin/staff': 'Equipo Administrativo',
};

export function TopBar({ userEmail, role }: Props) {
  const pathname = usePathname();
  const title = titles[pathname] ?? 'Liga.9';
  const initials = userEmail
    .split('@')[0]
    .split(/[._]/)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
          {role === 'admin' ? 'Admin' : 'Staff'} /
        </div>
        <h1 className="font-serif text-xl font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200">
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-mono text-blue-900 font-medium">
            TORNEO ACTIVO · 2026
          </span>
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
            {initials || 'US'}
          </div>
          <div className="text-[11px] text-slate-600 hidden md:block">
            {userEmail}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
