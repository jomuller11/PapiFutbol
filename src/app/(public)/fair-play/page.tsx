import { createClient } from '@/lib/supabase/server';
import { Shield } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';

export const metadata = {
  title: 'Fair Play — Liga.9',
  description: 'Tabla de fair play del torneo.',
};

export default async function FairPlayPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('stats_fairplay')
    .select('rank, team_name, yellow, blue, red, score')
    .order('rank', { ascending: true });

  const fairplay = (rows as any[]) ?? [];

  if (fairplay.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Fair Play" backHref="/more" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Fair Play" backHref="/more" />
      <div className="md:max-w-4xl md:mx-auto">

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 noise opacity-20" />
          <div className="relative text-center">
            <Shield className="w-10 h-10 mx-auto text-emerald-300 mb-2 opacity-80" />
            <div className="font-serif text-2xl font-bold">CONDUCTA DEPORTIVA</div>
          </div>
        </div>

        <div className="p-3">
          {/* Leyenda de tarjetas */}
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
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-3 py-2 border-b border-slate-100 bg-slate-50 gap-3">
              <div className="w-5 text-[9px] font-mono text-slate-400 text-center">#</div>
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Equipo</div>
              <div className="w-6 text-center text-xs">🟨</div>
              <div className="w-6 text-center text-xs">🟦</div>
              <div className="w-6 text-center text-xs">🟥</div>
              <div className="w-10 text-center text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Ptos</div>
            </div>

            <div className="divide-y divide-slate-50">
              {fairplay.map((row) => (
                <div
                  key={row.rank}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-3 py-3 gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-5 text-center font-mono text-xs text-slate-400 font-bold">{row.rank}</div>
                  <span className="font-semibold text-xs text-slate-900 truncate">{row.team_name}</span>
                  <div className="w-6 text-center font-mono text-xs text-slate-500">{row.yellow || '—'}</div>
                  <div className="w-6 text-center font-mono text-xs text-slate-500">{row.blue || '—'}</div>
                  <div className="w-6 text-center font-mono text-xs text-slate-500">{row.red || '—'}</div>
                  <div
                    className={`w-10 text-center font-bold font-mono text-xs ${
                      row.score === 0
                        ? 'text-emerald-600'
                        : row.score > -3
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {row.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center px-4">
            <p className="text-[10px] text-slate-400 font-mono">
              Mayor puntaje = mejor conducta. La tarjeta azul es exclusiva del torneo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Fair Play</h1>
      <p className="text-sm font-medium">Las estadísticas de fair play aparecerán cuando se sincronicen los datos.</p>
    </div>
  );
}
