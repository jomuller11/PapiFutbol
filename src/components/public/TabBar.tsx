'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Trophy, Target, Menu } from 'lucide-react';

export function TabBar() {
  const pathname = usePathname();

  const tabs = [
    { id: '/', href: '/', icon: Home, label: 'Home' },
    { id: '/fixture', href: '/fixture', icon: CalendarDays, label: 'Fixture' },
    { id: '/standings', href: '/standings', icon: Trophy, label: 'Tabla' },
    { id: '/scorers', href: '/scorers', icon: Target, label: 'Goles' },
    { id: '/more', href: '/more', icon: Menu, label: 'Más' },
  ];

  const getIsActive = (id: string) => {
    if (id === '/') return pathname === '/' || pathname === '';
    return pathname?.startsWith(id);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[68px] bg-white border-t border-slate-200 flex items-center px-2 z-50 md:hidden pb-safe">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = getIsActive(t.id);
        return (
          <Link
            key={t.id}
            href={t.href}
            className="flex-1 h-full flex flex-col items-center justify-center gap-1"
          >
            <Icon 
              className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-slate-400'}`} 
              strokeWidth={active ? 2.5 : 1.75} 
            />
            <span className={`text-[10px] font-medium ${active ? 'text-orange-500' : 'text-slate-500'}`}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
