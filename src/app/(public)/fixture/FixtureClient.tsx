'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { MatchRow } from '@/components/public/MatchRow';

export function FixtureClient({ matches }: { matches: any[] }) {
  // Encuentra la fecha activa por defecto (la próxima con partidos o la última)
  const rounds = Array.from(new Set(matches.map(m => m.round_number))).sort((a, b) => a - b);
  const defaultRound = rounds.length > 0 ? rounds[0] : 1;
  const [round, setRound] = useState(defaultRound);
  const [zone, setZone] = useState('all');

  let filtered = matches.filter(m => m.round_number === round);
  if (zone !== 'all') filtered = filtered.filter(m => m.group?.name?.includes(zone) || m.group_id === zone); // adaptado al name de group

  const byTime: Record<string, typeof matches> = {};
  filtered.forEach(m => { 
    if (!byTime[m.match_time]) byTime[m.match_time] = []; 
    byTime[m.match_time].push(m); 
  });

  return (
    <div>
      {/* Filtros */}
      <div className="bg-white border-b border-slate-200 p-3 space-y-2 sticky top-14 z-20 md:top-[96px]">
        {/* Fechas */}
        <div className="flex gap-1 overflow-x-auto hide-scroll -mx-3 px-3 pb-1">
          {rounds.map(r => (
            <button key={r} onClick={() => setRound(r)} className={`flex-shrink-0 w-8 h-8 font-display text-sm ${round === r ? 'bg-orange-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>
              {r}
            </button>
          ))}
          {/* Fill some empty rounds to simulate UX */}
          {rounds.length === 0 && [1,2,3,4].map(r => (
             <button key={r} className="flex-shrink-0 w-8 h-8 font-display text-sm bg-white border border-slate-200 text-slate-300 cursor-not-allowed">
               {r}
             </button>
          ))}
        </div>
        {/* Zonas */}
        <div className="flex gap-1 text-[10px] font-mono tracking-wider pt-1 border-t border-slate-100">
          <button onClick={() => setZone('all')} className={`px-2 py-0.5 ${zone === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            TODAS
          </button>
          <button onClick={() => setZone('A')} className={`px-2 py-0.5 ${zone === 'A' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            ZONA A
          </button>
          <button onClick={() => setZone('B')} className={`px-2 py-0.5 ${zone === 'B' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            ZONA B
          </button>
        </div>
      </div>

      {/* Partidos por horario */}
      <div className="p-4 space-y-6">
        {Object.keys(byTime).length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            No hay partidos programados para estos filtros.
          </div>
        ) : (
          Object.entries(byTime).sort().map(([time, matchesInTime]) => (
            <div key={time}>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-orange-500 text-white px-2 py-1 font-mono font-bold text-[11px] shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {time.substring(0, 5)}
                </div>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {matchesInTime.map(m => (
                  m.status === 'played' ?
                    <MatchRow key={m.id} match={m} showScore /> :
                    <MatchUpcomingRow key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MatchUpcomingRow({ match }: { match: any }) {
  const home = match.home_team;
  const away = match.away_team;
  return (
    <a href={`/match/${match.id}`} className="block w-full bg-white border border-slate-200 p-3 hover:bg-slate-50 transition-colors shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-center w-14 flex-shrink-0">
          <div className="font-display text-xl leading-none text-slate-800">{match.field_number}</div>
          <div className="font-mono text-[9px] text-slate-500 mt-1.5 tracking-widest uppercase">Cancha</div>
        </div>
        <div className="w-px h-10 bg-slate-100" />
        <div className="flex-1 space-y-2 py-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: home?.color || '#94a3b8' }} />
            <span className="text-sm font-semibold text-slate-900 truncate">{home?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: away?.color || '#94a3b8' }} />
            <span className="text-sm font-semibold text-slate-900 truncate">{away?.name}</span>
          </div>
        </div>
        {match.group_id && (
          <div className="text-[9px] font-mono bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 font-bold uppercase">
            {match.group?.name?.substring(0, 6)}
          </div>
        )}
      </div>
    </a>
  );
}
