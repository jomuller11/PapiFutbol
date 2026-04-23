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

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from('matches')
      .select('home_team_id, away_team_id, home_score, away_score')
      .eq('tournament_id', tid)
      .eq('status', 'played'),
    supabase
      .from('teams')
      .select('id, name, short_name, color')
      .eq('tournament_id', tid)
      .order('name'),
  ]);

  type TeamStat = {
    id: string; name: string; short_name: string; color: string;
    pj: number; gc: number; gf: number; cs: number;
  };

  const statsMap: Record<string, TeamStat> = {};
  for (const team of (teams as any[]) ?? []) {
    statsMap[team.id] = {
      id: team.id, name: team.name, short_name: team.short_name,
      color: team.color, pj: 0, gc: 0, gf: 0, cs: 0,
    };
  }
  for (const m of (matches as any[]) ?? []) {
    const home = statsMap[m.home_team_id];
    const away = statsMap[m.away_team_id];
    if (home) {
      home.pj++; home.gc += m.away_score ?? 0; home.gf += m.home_score ?? 0;
      if ((m.away_score ?? 0) === 0) home.cs++;
    }
    if (away) {
      away.pj++; away.gc += m.home_score ?? 0; away.gf += m.away_score ?? 0;
      if ((m.home_score ?? 0) === 0) away.cs++;
    }
  }

  const ranked = Object.values(statsMap)
    .filter(t => t.pj > 0)
    .sort((a, b) => {
      if (a.gc !== b.gc) return a.gc - b.gc;
      if (b.cs !== a.cs) return b.cs - a.cs;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });

  const unplayed = Object.values(statsMap).filter(t => t.pj === 0);
  const t = tournament as any;

  // Podium order: [2nd, 1st, 3rd]
  const podium = ranked.length >= 3
    ? [ranked[1], ranked[0], ranked[2]]
    : ranked.length === 2
    ? [null, ranked[0], ranked[1]]
    : ranked.length === 1
    ? [null, ranked[0], null]
    : [];

  const podiumHeights = ['h-16', 'h-20', 'h-12'];
  const podiumPositions = [2, 1, 3];
  const podiumColors = [
    'bg-slate-300 text-slate-900',
    'bg-orange-500 text-white',
    'bg-amber-700 text-white',
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Valla menos vencida" backHref="/" />

      {/* ── PODIO HERO ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-emerald-800 to-emerald-950 text-white px-4 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative">
          <div className="font-mono text-[10px] text-emerald-300 tracking-widest font-bold mb-1 text-center uppercase">
            GUANTES DORADOS · {t.year}
          </div>
          <div className="font-display text-2xl text-center mb-5 uppercase">
            VALLAS INVICTAS
          </div>

          {ranked.length === 0 ? (
            <div className="text-center py-8 text-emerald-200 text-sm">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
              Aún no hay partidos jugados.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 items-end">
                {podium.map((team, i) =>
                  team ? (
                    <div key={team.id} className="flex flex-col items-center">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-white mb-2 flex items-center justify-center font-display text-emerald-900 text-base font-bold">
                        {(team.short_name || team.name).slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-xs font-semibold text-center leading-tight px-1 line-clamp-2">
                        {team.name}
                      </div>
                      <div className="text-[10px] text-emerald-200 mb-2 text-center">
                        {team.cs} valla{team.cs !== 1 ? 's' : ''} invicta{team.cs !== 1 ? 's' : ''}
                      </div>
                      {/* Podium block */}
                      <div className={`w-full ${podiumHeights[i]} flex flex-col items-center justify-center ${podiumColors[i]}`}>
                        <div className="font-display text-2xl">{podiumPositions[i]}°</div>
                        <div className="font-mono text-[10px]">{team.gc} GC</div>
                      </div>
                    </div>
                  ) : (
                    <div key={`empty-${i}`} />
                  )
                )}
              </div>

              <div className="mt-4 text-center text-[10px] text-emerald-200 font-mono tracking-wider">
                ORDENADO POR GOLES EN CONTRA (MENOS = MEJOR)
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── LISTA COMPLETA ─────────────────────────────────────── */}
      {ranked.length > 0 && (
        <div className="p-3 space-y-2 md:max-w-2xl md:mx-auto md:pt-6">
          {ranked.map((team, i) => (
            <Link
              key={team.id}
              href={`/team/${team.id}`}
              className="w-full bg-white border border-slate-200 p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-9 h-9 font-display text-lg flex items-center justify-center flex-shrink-0 ${
                i === 0 ? 'bg-orange-500 text-white'
                : i === 1 ? 'bg-slate-300 text-slate-700'
                : i === 2 ? 'bg-amber-700 text-white'
                : 'bg-slate-100 text-slate-600'
              }`}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: team.color }} />
                  <div className="font-semibold text-sm text-slate-800 truncate">{team.name}</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span className="font-mono">{team.pj} PJ</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-emerald-600 font-semibold font-mono">
                    {team.cs} valla{team.cs !== 1 ? 's' : ''} invicta{team.cs !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="font-display text-xl text-emerald-700 leading-none">{team.gc}</div>
                <div className="font-mono text-[9px] text-slate-400 mt-1 tracking-wider">GC EN {team.pj} PJ</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Sin partidos */}
      {unplayed.length > 0 && (
        <div className="px-4 mt-4 md:max-w-2xl md:mx-auto">
          <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mb-2">Sin partidos jugados</div>
          <div className="flex flex-wrap gap-2">
            {unplayed.map(t => (
              <Link
                key={t.id}
                href={`/team/${t.id}`}
                className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-400 transition-colors"
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
