'use client';

import React, { useState } from 'react';
import { Search, Plus, User, X, Target, Square } from 'lucide-react';

const POSITIONS = ['ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL'];
const POSITION_NAMES: Record<string, string> = {
  ARQ: 'Arquero', DFC: 'Defensor Central', LAT: 'Lateral',
  MCC: 'Mediocampista Central', MCO: 'Mediocampista Ofensivo',
  EXT: 'Extremo', DEL: 'Delantero'
};

const MOCK_PLAYERS = [
  { id: 1, name: 'Matías Fernández', pos: 'ARQ', score: 85, team: 'Los Tigres', age: 28, goals: 0, yc: 1, rc: 0, bc: 0 },
  { id: 2, name: 'Rodrigo Pérez', pos: 'DFC', score: 78, team: 'Los Tigres', age: 26, goals: 1, yc: 2, rc: 0, bc: 1 },
  { id: 3, name: 'Lucas Morales', pos: 'DEL', score: 92, team: 'FC Boreal', age: 24, goals: 7, yc: 0, rc: 0, bc: 0 },
  { id: 4, name: 'Sebastián Ríos', pos: 'MCO', score: 88, team: 'FC Boreal', age: 29, goals: 4, yc: 1, rc: 0, bc: 0 },
  { id: 5, name: 'Diego Alvarez', pos: 'EXT', score: 80, team: 'Racing del Sur', age: 25, goals: 3, yc: 2, rc: 1, bc: 0 },
  { id: 6, name: 'Nicolás Herrera', pos: 'LAT', score: 72, team: 'Racing del Sur', age: 31, goals: 0, yc: 3, rc: 0, bc: 2 },
  { id: 13, name: 'Martín Cabrera', pos: 'LAT', score: 70, team: null, age: 22, goals: 0, yc: 0, rc: 0, bc: 0 },
];

export default function PlayersView() {
  const [selectedPos, setSelectedPos] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  const filtered = selectedPos === 'all' ? MOCK_PLAYERS : MOCK_PLAYERS.filter(p => p.pos === selectedPos);

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6">
      <div className="col-span-2">
        {/* Filtros */}
        <div className="bg-neutral-900 border border-neutral-800 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar jugador..."
                className="w-full bg-neutral-800 border border-neutral-700 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-lime-400 text-neutral-100"
              />
            </div>
            <button className="bg-lime-400 text-neutral-950 px-4 py-2 text-sm font-bold flex items-center gap-1.5 hover:bg-lime-300 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedPos('all')}
              className={`px-3 py-1 text-[10px] font-mono tracking-wider font-bold ${selectedPos === 'all' ? 'bg-lime-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-100'}`}
            >
              TODAS
            </button>
            {POSITIONS.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPos(p)}
                className={`px-3 py-1 text-[10px] font-mono tracking-wider font-bold ${selectedPos === p ? 'bg-lime-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-100'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="bg-neutral-900 border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-mono text-neutral-500 uppercase">
              <tr className="border-b border-neutral-800">
                <th className="text-left px-5 py-3">Jugador</th>
                <th className="text-center py-3">Pos</th>
                <th className="text-center py-3">Edad</th>
                <th className="text-center py-3">Equipo</th>
                <th className="text-center py-3 px-5">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  className={`border-b border-neutral-800 last:border-0 cursor-pointer transition-colors ${selectedPlayer?.id === p.id ? 'bg-lime-400/5' : 'hover:bg-neutral-800/50'}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {p.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="font-mono text-[10px] bg-neutral-800 px-1.5 py-0.5 font-bold text-neutral-300">{p.pos}</span>
                  </td>
                  <td className="text-center font-mono text-neutral-400">{p.age}</td>
                  <td className="text-center text-xs">
                    {p.team ? p.team : <span className="text-yellow-400 font-mono text-[10px] font-bold">SIN EQUIPO</span>}
                  </td>
                  <td className="text-center px-5">
                    <ScoreBadge score={p.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel de detalle */}
      <div className="col-span-1">
        {selectedPlayer ? (
          <PlayerDetail player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 p-12 text-center text-neutral-500 text-sm h-[calc(100vh-8rem)] sticky top-24 flex flex-col items-center justify-center">
            <User className="w-12 h-12 mx-auto mb-3 text-neutral-700" />
            <p className="font-medium">Seleccioná un jugador</p>
            <p className="text-xs mt-1">para ver sus detalles y puntaje</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'text-lime-400 border-lime-400/30 bg-lime-400/10'
    : score >= 75 ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
    : 'text-neutral-400 border-neutral-700 bg-neutral-800';
  return (
    <span className={`inline-block font-display text-sm px-2 py-0.5 border font-bold ${color}`}>{score}</span>
  );
}

function PlayerDetail({ player, onClose }: any) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 sticky top-24">
      <div className="relative h-32 bg-gradient-to-br from-lime-400 to-emerald-600 pitch-pattern">
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-neutral-950/50 flex items-center justify-center hover:bg-neutral-950 transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="absolute -bottom-10 left-6 w-20 h-20 bg-neutral-800 border-4 border-neutral-900 flex items-center justify-center font-display text-2xl font-bold text-white">
          {player.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
        </div>
      </div>
      <div className="pt-12 px-6 pb-6">
        <div className="font-display text-xl mb-1 font-bold">{player.name}</div>
        <div className="flex items-center gap-2 mb-5">
          <span className="font-mono text-[10px] bg-lime-400/10 text-lime-400 border border-lime-400/30 px-2 py-0.5 font-bold">{POSITION_NAMES[player.pos]}</span>
          <span className="text-xs text-neutral-500 font-bold">· {player.age} años</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-neutral-800 p-3">
            <div className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider font-bold">Puntaje</div>
            <div className="font-display text-2xl text-lime-400 font-bold">{player.score}</div>
          </div>
          <div className="bg-neutral-800 p-3">
            <div className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider font-bold">Equipo</div>
            <div className="text-sm font-semibold mt-1 text-white">{player.team || '—'}</div>
          </div>
        </div>

        <div className="mb-5">
          <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold">Estadísticas</div>
          <div className="grid grid-cols-4 gap-2">
            <StatMini icon={Target} value={player.goals} label="Goles" color="lime" />
            <StatMini icon={Square} value={player.yc} label="Amar" color="yellow" />
            <StatMini icon={Square} value={player.rc} label="Rojas" color="red" />
            <StatMini icon={Square} value={player.bc} label="Azules" color="blue" />
          </div>
        </div>

        <div className="space-y-2">
          <button className="w-full bg-lime-400 text-neutral-950 py-2 text-sm font-bold hover:bg-lime-300 transition-colors">Editar perfil</button>
          <button className="w-full bg-neutral-800 text-neutral-300 py-2 text-sm font-bold hover:bg-neutral-700 transition-colors border border-transparent hover:border-neutral-600">Cambiar puntaje</button>
        </div>
      </div>
    </div>
  );
}

function StatMini({ icon: Icon, value, label, color }: any) {
  const colors: Record<string, string> = {
    lime: 'text-lime-400', yellow: 'text-yellow-400', red: 'text-red-400', blue: 'text-blue-400'
  };
  return (
    <div className="bg-neutral-800/50 p-2 text-center">
      <Icon className={`w-3 h-3 mx-auto mb-1 ${colors[color]}`} />
      <div className="font-display text-base font-bold text-white">{value}</div>
      <div className="font-mono text-[9px] text-neutral-500 uppercase font-bold">{label}</div>
    </div>
  );
}
