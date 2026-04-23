'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Lock } from 'lucide-react';

export function DesktopNav({ tournamentName, tournamentYear }: { tournamentName?: string, tournamentYear?: number }) {
  const pathname = usePathname();

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/fixture', label: 'Fixture' },
    { href: '/standings', label: 'Posiciones' },
    { href: '/scorers', label: 'Goleadores' },
    { href: '/fair-play', label: 'Fair Play' },
    { href: '/goalkeepers', label: 'Valla' },
    { href: '/bracket', label: 'Bracket', locked: true },
  ];

  return (
    <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-blue-900 flex items-center justify-center relative">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500" />
          </div>
          <div>
            <div className="font-serif text-xl font-black text-blue-900 leading-none">
              Liga<span className="text-orange-500">.</span>9
            </div>
            {tournamentName && (
              <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                {tournamentName} · {tournamentYear}
              </div>
            )}
          </div>
        </Link>

        {/* Nav links + button */}
        <div className="flex items-center gap-6">
          {nav.map(({ href, label, locked }) => {
            const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                  active
                    ? 'text-orange-500 font-semibold'
                    : locked
                    ? 'text-slate-400 opacity-60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {locked && <Lock className="w-3 h-3" />}
                {label}
              </Link>
            );
          })}

          <Link
            href="/login"
            className="bg-blue-900 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-800 transition-colors"
          >
            Ingresar
          </Link>
        </div>

      </div>
    </header>
  );
}
