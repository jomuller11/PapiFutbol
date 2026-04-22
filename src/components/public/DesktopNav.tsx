'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Calendar, BarChart3, Shield, Zap, Menu } from 'lucide-react';

export function DesktopNav({ tournamentName, tournamentYear }: { tournamentName?: string, tournamentYear?: number }) {
  const pathname = usePathname();

  const nav = [
    { href: '/fixture', label: 'Fixture', icon: Calendar },
    { href: '/standings', label: 'Posiciones', icon: BarChart3 },
    { href: '/scorers', label: 'Goleadores', icon: Zap },
    { href: '/more', label: 'Más', icon: Menu },
  ];

  return (
    <header className="hidden md:block bg-blue-900 text-white sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-serif font-bold text-base leading-none">
                Liga<span className="text-orange-400">.</span>9
              </span>
              {tournamentName && (
                <div className="text-[10px] text-blue-300 font-mono leading-none mt-0.5">
                  {tournamentName} · {tournamentYear}
                </div>
              )}
            </div>
          </Link>

          {/* Acceso panel */}
          <Link
            href="/login"
            className="text-xs text-blue-300 hover:text-white transition-colors font-medium"
          >
            Panel →
          </Link>
        </div>

        {/* Nav tabs */}
        <nav className="flex -mb-px overflow-x-auto hide-scroll">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href) || (href === '/' && pathname === '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active 
                    ? 'text-white border-orange-400' 
                    : 'text-blue-200 hover:text-white border-transparent hover:border-orange-400/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
