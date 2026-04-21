'use client';

import React, { useState, useMemo } from 'react';
import { Shuffle, Zap } from 'lucide-react';

const MOCK_PLAYERS = [
  { id: 1, name: 'Matías Fernández', pos: 'ARQ', score: 85 },
  { id: 2, name: 'Rodrigo Pérez', pos: 'DFC', score: 78 },
  { id: 3, name: 'Lucas Morales', pos: 'DEL', score: 92 },
  { id: 4, name: 'Sebastián Ríos', pos: 'MCO', score: 88 },
  { id: 5, name: 'Diego Alvarez', pos: 'EXT', score: 80 },
  { id: 6, name: 'Nicolás Herrera', pos: 'LAT', score: 72 },
  { id: 7, name: 'Federico Vega', pos: 'MCC', score: 83 },
  { id: 8, name: 'Joaquín Díaz', pos: 'DEL', score: 86 },
  { id: 9, name: 'Tomás Aguirre', pos: 'ARQ', score: 81 },
  { id: 10, name: 'Bruno Navarro', pos: 'DFC', score: 75 },
  { id: 11, name: 'Ignacio Ruiz', pos: 'EXT', score: 79 },
  { id: 12, name: 'Emiliano Sosa', pos: 'MCO', score: 84 },
  { id: 13, name: 'Martín Cabrera', pos: 'LAT', score: 70 },
  { id: 14, name: 'Juan Medina', pos: 'DEL', score: 77 },
];

export default function TeamDrawView() {
  const [numTeams, setNumTeams] = useState(4);
  const [drawResult, setDrawResult] = useState<any[][] | null>(null);

  const activePlayers = MOCK_PLAYERS;
  const avgTotal = useMemo(() => {
    const sum = activePlayers.reduce((a, p) => a + p.score, 0);
    return Math.round(sum / numTeams);
  }, [numTeams, activePlayers]);

  const doDraw = () => {
    // Snake draft por puntaje
    const sorted = [...activePlayers].sort((a,b) => b.score - a.score);
    const teams: any[][] = Array.from({length: numTeams}, () => []);
    sorted.forEach((p, i) => {
      const round = Math.floor(i / numTeams);
      const idx = round % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams);
      teams[idx].push(p);
    });
    setDrawResult(teams);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-neutral-900 border border-neutral-800 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shuffle className="w-4 h-4 text-lime-400" />
          <h3 className="font-display text-sm tracking-wide font-bold">SORTEO POR PUNTAJE BALANCEADO</h3>
        </div>
        <p className="text-sm text-neutral-400 mb-6">
          El sistema reparte los jugadores usando snake draft según su puntaje, buscando que la suma total sea lo más pareja posible entre equipos.
        </p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 font-bold">Cantidad de equipos</label>
            <div className="flex gap-2">
              {[4, 6, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setNumTeams(n)}
                  className={`flex-1 py-2 font-display text-sm font-bold transition-colors ${numTeams === n ? 'bg-lime-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-100'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 font-bold">Jugadores disponibles</label>
            <div className="font-display text-2xl font-bold">{activePlayers.length}</div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 font-bold">Puntaje objetivo/equipo</label>
            <div className="font-display text-2xl text-lime-400 font-bold">~{avgTotal}</div>
          </div>
          <div className="flex items-end">
            <button
              onClick={doDraw}
              className="w-full bg-yellow-400 text-neutral-950 py-3 font-display text-sm flex items-center justify-center gap-2 hover:bg-yellow-300 font-bold transition-colors"
            >
              <Zap className="w-4 h-4" /> EJECUTAR SORTEO
            </button>
          </div>
        </div>
      </div>

      {drawResult && (
        <div className="grid grid-cols-3 gap-4">
          {drawResult.map((team, i) => {
            const total = team.reduce((a, p) => a + p.score, 0);
            const diff = total - avgTotal;
            return (
              <div key={i} className="bg-neutral-900 border border-neutral-800">
                <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] text-neutral-500 tracking-widest font-bold">EQUIPO</div>
                    <div className="font-display font-bold">Equipo {i + 1}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl text-lime-400 font-bold">{total}</div>
                    <div className={`text-[10px] font-mono font-bold ${diff === 0 ? 'text-neutral-500' : diff > 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {diff > 0 ? '+' : ''}{diff}
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {team.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[9px] bg-neutral-800 px-1 py-0.5 text-neutral-400 flex-shrink-0 font-bold">{p.pos}</span>
                        <span className="truncate font-medium">{p.name}</span>
                      </div>
                      <span className="font-mono text-neutral-500 flex-shrink-0 ml-2">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
