'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

const MOCK_TEAMS = [
  { id: 1, name: 'Los Tigres', avg: 78.5, zone: 'A', pj: 3, pg: 2, pe: 1, pp: 0, gf: 7, gc: 3, pts: 7 },
  { id: 2, name: 'FC Boreal', avg: 85.0, zone: 'A', pj: 3, pg: 3, pe: 0, pp: 0, gf: 11, gc: 2, pts: 9 },
  { id: 3, name: 'Racing del Sur', avg: 74.2, zone: 'B', pj: 3, pg: 1, pe: 1, pp: 1, gf: 4, gc: 5, pts: 4 },
  { id: 4, name: 'Unión Norte', avg: 82.1, zone: 'B', pj: 3, pg: 2, pe: 0, pp: 1, gf: 8, gc: 4, pts: 6 },
  { id: 5, name: 'Atlético Este', avg: 76.8, zone: 'A', pj: 3, pg: 1, pe: 0, pp: 2, gf: 5, gc: 8, pts: 3 },
  { id: 6, name: 'Deportivo Oeste', avg: 80.3, zone: 'B', pj: 3, pg: 2, pe: 1, pp: 0, gf: 6, gc: 2, pts: 7 },
];

export default function TeamsView() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_TEAMS.map(t => (
          <div key={t.id} className="bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="relative h-24 bg-gradient-to-br from-neutral-800 to-neutral-900 pitch-pattern flex items-center justify-between px-5">
              <div>
                <div className="font-mono text-[10px] text-neutral-500 tracking-widest font-bold">ZONA {t.zone}</div>
                <div className="font-display text-lg font-bold text-white">{t.name}</div>
              </div>
              <div className="w-14 h-14 bg-lime-400 text-neutral-950 font-display text-xl flex items-center justify-center font-bold">
                {t.name.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
            </div>
            <div className="p-4 grid grid-cols-4 gap-2 text-center border-b border-neutral-800">
              <div>
                <div className="font-display font-bold">{t.pj}</div>
                <div className="font-mono text-[9px] text-neutral-500 font-bold">PJ</div>
              </div>
              <div>
                <div className="font-display text-lime-400 font-bold">{t.pg}</div>
                <div className="font-mono text-[9px] text-neutral-500 font-bold">PG</div>
              </div>
              <div>
                <div className="font-display text-red-400 font-bold">{t.pp}</div>
                <div className="font-mono text-[9px] text-neutral-500 font-bold">PP</div>
              </div>
              <div>
                <div className="font-display text-yellow-400 font-bold">{t.pts}</div>
                <div className="font-mono text-[9px] text-neutral-500 font-bold">PTS</div>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider font-bold">Puntaje promedio</div>
                <div className="font-display text-base text-lime-400 font-bold">{t.avg}</div>
              </div>
              <button className="text-xs text-neutral-400 hover:text-lime-400 flex items-center gap-1 font-bold transition-colors">
                Ver plantel <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
