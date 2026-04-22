'use client';

import { useState } from 'react';
import { Shield, Zap } from 'lucide-react';

export function MatchDetailClient({ match, goals, cards }: { match: any, goals: any[], cards: any[] }) {
  const [activeTab, setActiveTab] = useState('events');

  const ht = match.home_team;
  const at = match.away_team;
  
  const events = [...goals, ...cards].sort((a, b) => a.minute - b.minute);

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      {/* TABS */}
      <div className="bg-white border-b border-slate-200 flex text-sm font-semibold sticky top-[56px] z-20">
        <button 
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-3 border-b-2 transition-colors ${activeTab === 'events' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'}`}
        >
          Eventos
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 border-b-2 transition-colors ${activeTab === 'stats' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'}`}
        >
          Estadísticas
        </button>
      </div>

      {activeTab === 'events' && (
        <div className="p-4 space-y-4">
          <div className="bg-white border border-slate-200">
            {events.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No hay eventos registrados</div>
            ) : (
              events.map((e, i) => {
                const isHome = e.team_id === ht.id;
                const pName = e.player?.nickname || `${e.player?.first_name} ${e.player?.last_name}` || 'Desconocido';
                const isGoal = 'is_own_goal' in e;
                
                return (
                  <div key={`${isGoal ? 'g' : 'c'}-${e.id}`} className="flex items-center px-4 py-3 border-b border-slate-50 last:border-0 relative">
                    {/* Línea de tiempo (central) */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 -translate-x-1/2 z-0" />
                    
                    {isHome ? (
                      <>
                        <div className="flex-1 text-right pr-4 relative z-10">
                          <div className="font-semibold text-sm text-slate-900">{pName}</div>
                          {isGoal && e.is_own_goal && <div className="text-[10px] text-slate-400">Gol en contra</div>}
                        </div>
                        <div className="w-8 flex justify-center relative z-10 bg-white">
                          <EventIcon event={e} isGoal={isGoal} />
                        </div>
                        <div className="flex-1 pl-4 relative z-10 text-[11px] font-mono font-bold text-slate-400">{e.minute}'</div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 text-right pr-4 relative z-10 text-[11px] font-mono font-bold text-slate-400">{e.minute}'</div>
                        <div className="w-8 flex justify-center relative z-10 bg-white">
                          <EventIcon event={e} isGoal={isGoal} />
                        </div>
                        <div className="flex-1 pl-4 relative z-10">
                          <div className="font-semibold text-sm text-slate-900">{pName}</div>
                          {isGoal && e.is_own_goal && <div className="text-[10px] text-slate-400">Gol en contra</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {(match.observer_team?.name || match.notes) && (
            <div className="bg-white border border-slate-200 p-4 mt-6">
              <div className="font-display text-lg mb-2 text-slate-800">OBSERVACIONES</div>
              {match.observer_team?.name && (
                <div className="text-sm text-slate-600 mb-2">
                  <span className="font-semibold">Veedor:</span> {match.observer_team.name}
                </div>
              )}
              {match.notes && (
                <div className="text-sm text-slate-600">
                  <span className="font-semibold">Notas:</span> {match.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="p-4">
          <div className="bg-white border border-slate-200 p-4">
            <StatRow label="Goles" valA={match.home_score ?? 0} valB={match.away_score ?? 0} colorA={ht.color} colorB={at.color} />
            <StatRow 
              label="Tarjetas Amarillas" 
              valA={cards.filter(c => c.type === 'yellow' && c.team_id === ht.id).length} 
              valB={cards.filter(c => c.type === 'yellow' && c.team_id === at.id).length} 
              colorA={ht.color} colorB={at.color} 
            />
            <StatRow 
              label="Tarjetas Azules/Rojas" 
              valA={cards.filter(c => c.type !== 'yellow' && c.team_id === ht.id).length} 
              valB={cards.filter(c => c.type !== 'yellow' && c.team_id === at.id).length} 
              colorA={ht.color} colorB={at.color} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EventIcon({ event, isGoal }: { event: any, isGoal: boolean }) {
  if (isGoal) {
    return <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />;
  }
  if (event.type === 'yellow') {
    return <div className="w-3 h-4 bg-amber-400 rounded-sm shadow-sm" />;
  }
  if (event.type === 'blue') {
    return <div className="w-3 h-4 bg-blue-500 rounded-sm shadow-sm" />;
  }
  return <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />;
}

function StatRow({ label, valA, valB, colorA, colorB }: { label: string, valA: number, valB: number, colorA: string, colorB: string }) {
  const total = valA + valB;
  const pctA = total === 0 ? 50 : (valA / total) * 100;
  const pctB = total === 0 ? 50 : (valB / total) * 100;

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex justify-between text-sm font-semibold mb-1.5">
        <span className="text-slate-800">{valA}</span>
        <span className="text-xs text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-slate-800">{valB}</span>
      </div>
      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
        <div className="h-full" style={{ width: `${pctA}%`, background: valA > 0 ? colorA : '#e2e8f0' }} />
        <div className="h-full" style={{ width: `${pctB}%`, background: valB > 0 ? colorB : '#e2e8f0' }} />
      </div>
    </div>
  );
}
