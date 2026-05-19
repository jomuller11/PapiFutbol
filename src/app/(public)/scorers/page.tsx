import { createClient } from '@/lib/supabase/server';
import { Zap } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';

export const metadata = {
  title: 'Goleadores — Liga.9',
  description: 'Tabla de goleadores del torneo.',
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

export default async function ScorersPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('stats_scorers')
    .select('rank, player_name, team_name, goals')
    .order('rank', { ascending: true });

  const scorers = (rows as any[]) ?? [];

  if (scorers.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Goleadores" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  const top3 = scorers.slice(0, 3);
  // Podium order: [2nd, 1st, 3rd]
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Goleadores" backHref="/" />
      <div className="md:max-w-4xl md:mx-auto">

        {/* Podio top 3 */}
        <div className="bg-gradient-to-b from-blue-900 to-blue-950 text-white px-4 pt-6 pb-8 relative overflow-hidden">
          <div className="absolute inset-0 stadium-grid opacity-30" />
          <div className="relative">
            <div className="font-mono text-[10px] text-orange-400 tracking-widest font-bold mb-1 text-center uppercase">
              Pie de Oro
            </div>
            <div className="font-display text-2xl text-center mb-5 tracking-wide uppercase">
              Tabla de Artilleros
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              {podium.map((s, idx) => {
                const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const heightClass = idx === 1 ? 'h-20' : idx === 0 ? 'h-16' : 'h-12';
                const podiumColor =
                  pos === 1
                    ? 'bg-orange-500'
                    : pos === 2
                    ? 'bg-slate-300 text-slate-900'
                    : 'bg-amber-700';
                return (
                  <div key={s.rank} className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 mb-2 flex items-center justify-center font-display text-base font-bold">
                      {initials(s.player_name)}
                    </div>
                    <div className="text-xs font-semibold text-center leading-tight truncate w-full px-1">
                      {capName(s.player_name)}
                    </div>
                    <div className="text-[10px] text-blue-200 mb-2 truncate w-full text-center">
                      {capName(s.team_name)}
                    </div>
                    <div className={`w-full ${heightClass} flex flex-col items-center justify-center ${podiumColor}`}>
                      <div className="font-display text-2xl">{pos}°</div>
                      <div className="font-mono text-[10px] font-bold">{s.goals} GOLES</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lista completa */}
        <div className="p-3 space-y-2">
          {scorers.map((s, i) => (
            <div
              key={s.rank}
              className="w-full bg-white border border-slate-200 p-3 flex items-center gap-3 shadow-sm"
            >
              <div
                className={`w-9 h-9 font-display text-lg flex items-center justify-center flex-shrink-0 ${
                  i === 0
                    ? 'bg-orange-500 text-white'
                    : i === 1
                    ? 'bg-slate-300 text-slate-700'
                    : i === 2
                    ? 'bg-amber-700 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.rank}
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-xs text-blue-900 font-semibold">
                  {initials(s.player_name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 truncate">
                  {capName(s.player_name)}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {capName(s.team_name)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display text-2xl text-blue-900 leading-none">{s.goals}</div>
                <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">
                  Goles
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Goleadores</h1>
      <p className="text-sm font-medium">Los goleadores aparecerán cuando se sincronicen los datos.</p>
    </div>
  );
}
