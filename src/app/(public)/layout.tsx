import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Trophy, Calendar, BarChart3, Shield, Zap } from 'lucide-react';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, year, status')
    .eq('status', 'active')
    .maybeSingle();

  const nav = [
    { href: '/fixture', label: 'Fixture', icon: Calendar },
    { href: '/standings', label: 'Posiciones', icon: BarChart3 },
    { href: '/scorers', label: 'Goleadores', icon: Zap },
    { href: '/fair-play', label: 'Fair Play', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header público */}
      <header className="bg-blue-900 text-white sticky top-0 z-40">
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
                {tournament && (
                  <div className="text-[10px] text-blue-300 font-mono leading-none mt-0.5">
                    {tournament.name} · {tournament.year}
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
          <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-blue-200 hover:text-white border-b-2 border-transparent hover:border-orange-400 transition-colors whitespace-nowrap"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {!tournament && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-sm text-sm text-amber-800 mb-6 text-center">
            No hay torneo activo actualmente. Volvé pronto.
          </div>
        )}
        {children}
      </main>

      <footer className="mt-12 py-6 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-slate-400 font-mono">
          LIGA.9 · TORNEO COLEGIAL · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
