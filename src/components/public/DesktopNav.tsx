'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { SiteBrand } from '@/components/branding/SiteBrand';

export function DesktopNav({
  tournamentName,
  tournamentYear,
  brandName,
  logoUrl,
}: {
  tournamentName?: string;
  tournamentYear?: number;
  brandName?: string | null;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/fixture', label: 'Fixture' },
    { href: '/standings', label: 'Posiciones' },
    { href: '/scorers', label: 'Goleadores' },
    { href: '/fair-play', label: 'Fair Play' },
    { href: '/sanctions', label: 'Sanciones' },
    { href: '/goalkeepers', label: 'Valla' },
    { href: '/bracket', label: 'Bracket', locked: true },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <div className="flex flex-col gap-1 flex-shrink-0">
          <SiteBrand href="/" size="sm" showSubtitle={false} brandName={brandName} logoUrl={logoUrl} />
          {tournamentName ? (
            <div className="pl-[52px] font-mono text-[10px] leading-none text-slate-400">
              {tournamentName} · {tournamentYear}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-6">
          {nav.map(({ href, label, locked }) => {
            const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                  active
                    ? 'font-semibold text-[#D78820]'
                    : locked
                      ? 'text-slate-400 opacity-60'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {locked ? <Lock className="h-3 w-3" /> : null}
                {label}
              </Link>
            );
          })}

          <Link
            href="/login"
            className="bg-[#234571] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1c3658]"
          >
            Ingresar
          </Link>
        </div>
      </div>
    </header>
  );
}
