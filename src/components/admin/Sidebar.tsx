'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Trophy, Users, Shuffle, Shield, CalendarDays,
  UserCheck, Settings, ShieldCheck, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  role: 'admin' | 'staff';
};

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/tournament', icon: Trophy, label: 'Torneo', adminOnly: true },
  { href: '/admin/players', icon: Users, label: 'Jugadores' },
  { href: '/admin/approvals', icon: UserCheck, label: 'Inscripciones' },
  { href: '/admin/draw', icon: Shuffle, label: 'Sorteo', adminOnly: true },
  { href: '/admin/teams', icon: Shield, label: 'Equipos' },
  { href: '/admin/fixture', icon: CalendarDays, label: 'Fixture' },
  { href: '/admin/staff', icon: ShieldCheck, label: 'Equipo admin', adminOnly: true },
];

export function Sidebar({ role }: Props) {
  const pathname = usePathname();
  const items = navItems.filter(item => !item.adminOnly || role === 'admin');

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-900 flex items-center justify-center relative">
            <Trophy className="w-6 h-6 text-white" strokeWidth={2} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500" />
          </div>
          <div>
            <div className="font-serif text-xl font-bold leading-none text-blue-900">
              Liga<span className="text-orange-500">.</span>9
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1 tracking-widest">
              {role === 'admin' ? 'ADMIN PANEL' : 'STAFF PANEL'}
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3">
        {items.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mb-0.5 text-sm transition-all rounded-md',
                active
                  ? 'bg-blue-900 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={active ? 2.25 : 1.75} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-4 h-4" strokeWidth={2.5} />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2 px-2 text-[10px] font-mono text-slate-400">
          <Settings className="w-3 h-3" />
          <span className="tracking-widest uppercase">Liga.9 · 2026</span>
        </div>
      </div>
    </aside>
  );
}
