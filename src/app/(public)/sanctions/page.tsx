import { createClient } from '@/lib/supabase/server';
import { MobileHeader } from '@/components/public/MobileHeader';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Sanciones — Liga.9',
  description: 'Ranking de jugadores sancionados del torneo.',
};

function capName(s: string) {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function SanctionsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('stats_sanctions')
    .select('rank, player_name, team_name, yellow, blue, red, fechas, cumplidas')
    .order('rank', { ascending: true });

  const sanctions = (rows as any[]) ?? [];

  if (sanctions.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Sanciones" backHref="/more" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Sanciones" backHref="/more" />
      <div className="md:max-w-4xl md:mx-auto">

        {/* Hero */}
        <div className="bg-gradient-to-br from-red-700 via-red-800 to-red-950 text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 noise opacity-20" />
          <div className="relative text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-red-200 mb-2 opacity-80" />
            <div className="font-serif text-2xl font-bold">SANCIONES</div>
          </div>
        </div>

        <div className="p-3">
          {/* Leyenda */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white border border-slate-200 p-2 text-center shadow-sm">
              <div className="w-4 h-6 bg-yellow-400 mx-auto rounded-sm mb-1.5 shadow-sm" />
              <div className="text-[10px] font-semibold text-slate-800">Amarilla</div>
            </div>
            <div className="bg-white border border-slate-200 p-2 text-center shadow-sm">
              <div className="w-4 h-6 bg-blue-500 mx-auto rounded-sm mb-1.5 shadow-sm" />
              <div className="text-[10px] font-semibold text-slate-800">Azul</div>
            </div>
            <div className="bg-white border border-slate-200 p-2 text-center shadow-sm">
              <div className="w-4 h-6 bg-red-500 mx-auto rounded-sm mb-1.5 shadow-sm" />
              <div className="text-[10px] font-semibold text-slate-800">Roja</div>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 py-2 font-mono text-[9px] text-slate-400 uppercase w-8">#</th>
                    <th className="text-left py-2 font-mono text-[9px] text-slate-400 uppercase">Jugador</th>
                    <th className="text-center py-2 font-mono text-[9px] text-slate-400 w-6">🟨</th>
                    <th className="text-center py-2 font-mono text-[9px] text-slate-400 w-6">🟦</th>
                    <th className="text-center py-2 font-mono text-[9px] text-slate-400 w-6">🟥</th>
                    <th className="text-center py-2 pr-3 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-14 hidden sm:table-cell">Fechas</th>
                    <th className="text-center py-2 pr-3 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-16 hidden sm:table-cell">Cumplidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sanctions.map((row) => (
                    <tr key={row.rank} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-mono text-xs text-slate-400">{row.rank}</td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <span className="font-mono text-[10px] text-red-900 font-semibold">
                              {initials(row.player_name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">
                              {capName(row.player_name)}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {capName(row.team_name)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center font-mono text-xs text-slate-500">{row.yellow || '—'}</td>
                      <td className="py-3 text-center font-mono text-xs text-slate-500">{row.blue || '—'}</td>
                      <td className="py-3 text-center font-mono text-xs text-red-600 font-semibold">{row.red || '—'}</td>
                      <td className="py-3 pr-3 text-center font-mono text-xs text-slate-500 hidden sm:table-cell">{row.fechas}</td>
                      <td className="py-3 pr-3 text-center font-mono text-xs text-emerald-600 hidden sm:table-cell">{row.cumplidas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Sanciones</h1>
      <p className="text-sm font-medium">Las sanciones aparecerán cuando se sincronicen los datos.</p>
    </div>
  );
}
