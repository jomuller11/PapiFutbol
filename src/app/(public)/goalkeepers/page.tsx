import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MobileHeader } from '@/components/public/MobileHeader';
import { Shield } from 'lucide-react';

export const metadata = {
  title: 'Valla menos vencida — Liga.9',
  description: 'Equipos con menos goles en contra en el torneo.',
};

export default async function GoalkeepersPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Valla menos vencida" backHref="/" />
        <div className="p-6 text-center text-sm text-slate-500 mt-8">Sin torneo activo.</div>
      </div>
    );
  }

  const tid = (tournament as any).id as string;

  // Fetch played matches for this tournament
  const { data: matches } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id, home_score, away_score')
    .eq('tournament_id', tid)
    .eq('status', 'played');

  // Fetch teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, color, logo_url')
    .eq('tournament_id', tid)
    .order('name');

  type TeamStat = {
    id: string;
    name: string;
    short_name: string;
    color: string;
    logo_url: string | null;
    pj: number;
    gc: number;
    gf: number;
    cs: number; // clean sheets
  };

  const statsMap: Record<string, TeamStat> = {};

  for (const team of (teams as any[]) ?? []) {
    statsMap[team.id] = {
      id: team.id,
      name: team.name,
      short_name: team.short_name,
      color: team.color,
      logo_url: team.logo_url ?? null,
      pj: 0,
      gc: 0,
      gf: 0,
      cs: 0,
    };
  }

  for (const m of (matches as any[]) ?? []) {
    const home = statsMap[m.home_team_id];
    const away = statsMap[m.away_team_id];
    if (home) {
      home.pj++;
      home.gc += m.away_score ?? 0;
      home.gf += m.home_score ?? 0;
      if ((m.away_score ?? 0) === 0) home.cs++;
    }
    if (away) {
      away.pj++;
      away.gc += m.home_score ?? 0;
      away.gf += m.away_score ?? 0;
      if ((m.home_score ?? 0) === 0) away.cs++;
    }
  }

  const ranked = Object.values(statsMap)
    .filter(t => t.pj > 0)
    .sort((a, b) => {
      if (a.gc !== b.gc) return a.gc - b.gc; // fewer goals against = better
      if (b.cs !== a.cs) return b.cs - a.cs; // more clean sheets = better
      if (b.gf !== a.gf) return b.gf - a.gf; // more goals for = better
      return a.name.localeCompare(b.name);
    });

  const unplayed = Object.values(statsMap).filter(t => t.pj === 0);

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Valla menos vencida" backHref="/" />

      {/* Header */}
      <div className="bg-blue-900 px-4 pt-5 pb-4 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-20" />
        <div className="relative">
          <div className="font-mono text-[10px] text-blue-300 uppercase tracking-widest">
            {(tournament as any).name} · {(tournament as any).year}
          </div>
          <div className="font-serif text-2xl font-bold text-white mt-0.5">Valla menos vencida</div>
        </div>
      </div>

      {/* Column headers */}
      {ranked.length > 0 && (
        <div className="bg-white border-b border-slate-200 grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2">
          <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">Equipo</div>
          {['PJ', 'GF', 'GC', 'CS'].map(h => (
            <div key={h} className="font-mono text-[9px] text-slate-400 uppercase tracking-widest text-center w-8">{h}</div>
          ))}
        </div>
      )}

      {ranked.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          <Shield className="w-10 h-10 mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
          Aún no hay partidos jugados en este torneo.
        </div>
      ) : (
        <div className="bg-white border-b border-slate-200 divide-y divide-slate-100">
          {ranked.map((team, i) => (
            <Link
              key={team.id}
              href={`/team/${team.id}`}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-display text-lg font-bold text-blue-900 w-6 text-right flex-shrink-0 leading-none">
                  {i + 1}
                </span>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{team.name}</div>
                  {i === 0 && team.pj > 0 && (
                    <div className="font-mono text-[9px] text-emerald-600 font-semibold">Valla invicta ·  {team.cs} PG</div>
                  )}
                </div>
              </div>
              <Stat value={team.pj} />
              <Stat value={team.gf} />
              <Stat value={team.gc} highlight={i === 0} />
              <Stat value={team.cs} />
            </Link>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 flex gap-4 text-[10px] font-mono text-slate-400 flex-wrap">
        <span>PJ = Partidos jugados</span>
        <span>GF = Goles a favor</span>
        <span>GC = Goles en contra</span>
        <span>CS = Vallas invictas</span>
      </div>

      {/* Teams without matches */}
      {unplayed.length > 0 && (
        <div className="px-4 mt-2">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2">Sin partidos</div>
          <div className="flex flex-wrap gap-2">
            {unplayed.map(t => (
              <Link
                key={t.id}
                href={`/team/${t.id}`}
                className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-blue-700 transition-colors"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <div className={`font-display text-base font-bold text-center w-8 leading-none ${
      highlight ? 'text-emerald-600' : 'text-slate-700'
    }`}>
      {value}
    </div>
  );
}
