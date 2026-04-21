'use client';

import React, { useState, useMemo } from 'react';
import { Zap, Clock, MapPin, Eye, Check, ArrowRight, Save, Target, Square, Plus } from 'lucide-react';

const MOCK_MATCHES = [
  { id: 1, round: 4, date: '2026-04-25', time: '10:00', field: 1, home: 'Los Tigres', away: 'Atlético Este', zone: 'A', phase: 'Grupos', veedor: 'FC Boreal', status: 'pending' },
  { id: 2, round: 4, date: '2026-04-25', time: '10:00', field: 2, home: 'FC Boreal', away: 'Racing del Sur', zone: 'A', phase: 'Grupos', veedor: 'Unión Norte', status: 'pending' },
  { id: 3, round: 4, date: '2026-04-25', time: '10:00', field: 3, home: 'Unión Norte', away: 'Deportivo Oeste', zone: 'B', phase: 'Grupos', veedor: 'Atlético Este', status: 'pending' },
  { id: 4, round: 4, date: '2026-04-25', time: '10:00', field: 4, home: 'Racing del Sur', away: 'Los Tigres', zone: 'B', phase: 'Grupos', veedor: 'Deportivo Oeste', status: 'pending' },
  { id: 5, round: 4, date: '2026-04-25', time: '11:30', field: 1, home: 'Atlético Este', away: 'FC Boreal', zone: 'A', phase: 'Grupos', veedor: 'Los Tigres', status: 'pending' },
  { id: 6, round: 4, date: '2026-04-25', time: '11:30', field: 2, home: 'Deportivo Oeste', away: 'Unión Norte', zone: 'B', phase: 'Grupos', veedor: 'FC Boreal', status: 'pending' },
  { id: 7, round: 3, date: '2026-04-18', time: '10:00', field: 1, home: 'Los Tigres', away: 'FC Boreal', zone: 'A', phase: 'Grupos', veedor: 'Atlético Este', status: 'played', homeScore: 1, awayScore: 3 },
  { id: 8, round: 3, date: '2026-04-18', time: '11:30', field: 2, home: 'Unión Norte', away: 'Racing del Sur', zone: 'B', phase: 'Grupos', veedor: 'Deportivo Oeste', status: 'played', homeScore: 2, awayScore: 2 },
];

const MOCK_TEAMS = [
  { id: 1, name: 'Los Tigres' },
  { id: 2, name: 'FC Boreal' },
  { id: 3, name: 'Racing del Sur' },
  { id: 4, name: 'Unión Norte' },
  { id: 5, name: 'Atlético Este' },
  { id: 6, name: 'Deportivo Oeste' },
];

export default function FixtureView() {
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [filterRound, setFilterRound] = useState(4);

  if (selectedMatch) {
    return <MatchDetailView match={selectedMatch} onBack={() => setSelectedMatch(null)} />;
  }

  const matchesThisRound = MOCK_MATCHES.filter(m => m.round === filterRound);
  const byTime = matchesThisRound.reduce((map, m) => {
    if (!map[m.time]) map[m.time] = [];
    map[m.time].push(m);
    return map;
  }, {} as Record<string, typeof MOCK_MATCHES>);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Filtros */}
      <div className="bg-neutral-900 border border-neutral-800 p-4 mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Fase:</span>
          <select className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs font-bold text-white outline-none">
            <option>Fase de Grupos</option>
            <option>Cuartos de Final</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Fecha:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(r => (
              <button
                key={r}
                onClick={() => setFilterRound(r)}
                className={`w-8 h-8 font-display text-sm font-bold transition-colors ${filterRound === r ? 'bg-lime-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto">
          <button className="bg-yellow-400 text-neutral-950 px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-yellow-300 transition-colors">
            <Zap className="w-3.5 h-3.5" /> Generar Fixture
          </button>
        </div>
      </div>

      {/* Grid de partidos por horario y cancha */}
      <div className="space-y-6">
        {Object.entries(byTime).map(([time, matches]) => (
          <div key={time}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-yellow-400 text-neutral-950 font-display text-sm flex items-center justify-center flex-col font-bold">
                <Clock className="w-3 h-3" />
                <span className="text-[10px]">{time}</span>
              </div>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(field => {
                const m = matches.find((x: any) => x.field === field);
                if (!m) {
                  return (
                    <div key={field} className="border border-dashed border-neutral-800 p-4 text-center text-neutral-600 text-xs font-bold">
                      <MapPin className="w-4 h-4 mx-auto mb-1" />
                      Cancha {field} · Libre
                    </div>
                  );
                }
                return (
                  <button
                    key={field}
                    onClick={() => setSelectedMatch(m)}
                    className="bg-neutral-900 border border-neutral-800 hover:border-lime-400 p-4 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-mono text-[10px] text-lime-400 tracking-widest font-bold">CANCHA {m.field}</div>
                      <div className="font-mono text-[9px] bg-neutral-800 px-1.5 py-0.5 font-bold">Z{m.zone}</div>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{m.home}</span>
                        <span className="font-display text-lg font-bold">{m.status === 'played' ? m.homeScore : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{m.away}</span>
                        <span className="font-display text-lg font-bold">{m.status === 'played' ? m.awayScore : '-'}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-neutral-800 flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold">
                      <Eye className="w-3 h-3 text-neutral-500" />
                      <span className="font-mono">VEEDOR:</span>
                      <span className="truncate text-white">{m.veedor}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchDetailView({ match, onBack }: any) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const suggestedVeedores = ['FC Boreal', 'Unión Norte'];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-neutral-400 hover:text-lime-400 mb-4 font-bold transition-colors">
        ← Volver al fixture
      </button>

      {/* Header del partido */}
      <div className="bg-neutral-900 border border-neutral-800 mb-6 overflow-hidden">
        <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-900 to-lime-400/10 pitch-pattern p-8">
          <div className="flex items-center gap-4 mb-6 text-xs font-bold">
            <span className="font-mono bg-neutral-800 px-2 py-1 text-white">{match?.phase || 'Grupos'}</span>
            <span className="font-mono text-neutral-400">Fecha {match?.round || 4}</span>
            <span className="font-mono text-neutral-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Cancha {match?.field || 1}</span>
            <span className="font-mono text-neutral-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {match?.time || '10:00'}</span>
            <span className="font-mono text-neutral-400">{match?.date || '2026-04-25'}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-right">
              <div className="font-display text-3xl mb-2 font-bold text-white">{match?.home || 'Equipo Local'}</div>
              <div className="font-mono text-[10px] text-neutral-500 tracking-widest font-bold">LOCAL</div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <input
                type="number"
                value={homeScore}
                onChange={e => setHomeScore(+e.target.value)}
                className="w-20 h-20 bg-neutral-800 border-2 border-neutral-700 text-center font-display text-4xl text-white focus:border-lime-400 focus:outline-none"
              />
              <span className="font-display text-2xl text-neutral-600">—</span>
              <input
                type="number"
                value={awayScore}
                onChange={e => setAwayScore(+e.target.value)}
                className="w-20 h-20 bg-neutral-800 border-2 border-neutral-700 text-center font-display text-4xl text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
            <div className="text-left">
              <div className="font-display text-3xl mb-2 font-bold text-white">{match?.away || 'Equipo Visitante'}</div>
              <div className="font-mono text-[10px] text-neutral-500 tracking-widest font-bold">VISITANTE</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <StatSection
            icon={Target}
            title="GOLEADORES"
            color="lime"
            entries={[
              { player: 'Lucas Morales', team: match?.home, minute: 23 },
              { player: 'Joaquín Díaz', team: match?.away, minute: 45 },
            ]}
          />
          <StatSection
            icon={Square}
            title="TARJETAS AMARILLAS"
            color="yellow"
            entries={[
              { player: 'Rodrigo Pérez', team: match?.home, minute: 34 },
            ]}
          />
          <StatSection icon={Square} title="TARJETAS AZULES · 5 MIN FUERA" color="blue" entries={[]} />
          <StatSection icon={Square} title="TARJETAS ROJAS" color="red" entries={[]} />
        </div>

        <div>
          <div className="bg-neutral-900 border border-neutral-800 sticky top-24">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-lime-400" />
              <h3 className="font-display text-sm tracking-wide font-bold">VEEDOR</h3>
            </div>
            <div className="p-5">
              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold">Asignado actualmente</div>
              <div className="p-3 bg-lime-400/10 border border-lime-400/30 font-bold text-sm mb-5 text-white">
                {match?.veedor || 'FC Boreal'}
              </div>

              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold">Sugeridos por el sistema</div>
              <div className="text-[10px] text-neutral-500 mb-3 font-bold">Equipos que juegan en la misma cancha en horario adyacente.</div>
              <div className="space-y-2 mb-5">
                {suggestedVeedores.map((team: string) => (
                  <button key={team} className="w-full text-left p-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-between text-xs font-bold transition-colors">
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-lime-400" />
                      <span className="text-white">{team}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-neutral-500" />
                  </button>
                ))}
              </div>

              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold">Otros equipos</div>
              <select className="w-full bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs font-bold text-white outline-none focus:border-lime-400">
                <option>Seleccionar equipo...</option>
                {MOCK_TEAMS.map((t: any) => <option key={t.id}>{t.name}</option>)}
              </select>

              <button className="w-full bg-lime-400 text-neutral-950 mt-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-lime-300 transition-colors">
                <Save className="w-3.5 h-3.5" /> Guardar partido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatSection({ icon: Icon, title, color, entries }: any) {
  const colors: Record<string, string> = {
    lime: 'text-lime-400 bg-lime-400/10 border-lime-400/30',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    red: 'text-red-400 bg-red-400/10 border-red-400/30',
  };
  return (
    <div className="bg-neutral-900 border border-neutral-800">
      <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors[color].split(' ')[0]}`} />
          <h3 className="font-display text-xs tracking-wide font-bold">{title}</h3>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 border font-bold ${colors[color]}`}>{entries.length}</span>
        </div>
        <button className="text-xs text-lime-400 hover:underline flex items-center gap-1 font-bold">
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>
      <div className="p-3">
        {entries.length === 0 ? (
          <div className="text-center text-neutral-600 text-xs py-3 font-bold">Sin registros</div>
        ) : (
          <div className="space-y-1">
            {entries.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className={`font-mono text-[10px] px-1.5 py-0.5 border font-bold ${colors[color]}`}>{e.minute}'</span>
                <span className="font-semibold text-white">{e.player}</span>
                <span className="text-neutral-500 text-xs ml-auto font-bold">{e.team}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
