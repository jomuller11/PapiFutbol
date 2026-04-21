'use client';

import React, { useState } from 'react';
import { MapPin, Clock, Edit3, Plus, ChevronRight, Hash, Users, Trophy } from 'lucide-react';

export default function TournamentConfigPage() {
  const [phases, setPhases] = useState([
    { id: 1, name: 'Fase de Grupos', type: 'groups', zones: 2, teamsPerZone: 3, status: 'active' },
    { id: 2, name: 'Cuartos de Final', type: 'bracket', teams: 8, status: 'pending' },
    { id: 3, name: 'Semifinal', type: 'bracket', teams: 4, status: 'pending' },
    { id: 4, name: 'Final', type: 'bracket', teams: 2, status: 'pending' },
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Info torneo */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 mb-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Nombre del torneo</label>
            <div className="font-display text-lg mt-1 font-bold">Apertura 2026</div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Año</label>
            <div className="font-display text-lg mt-1 font-bold">2026</div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Estado</label>
            <div className="font-display text-lg mt-1 text-lime-400 font-bold">ACTIVO</div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Equipos</label>
            <div className="font-display text-lg mt-1 font-bold">6 · 72 jugadores</div>
          </div>
        </div>
      </div>

      {/* Configuración de canchas y horarios */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-lime-400" />
            <h3 className="font-display text-sm tracking-wide font-bold">CANCHAS</h3>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="flex items-center justify-between p-3 bg-neutral-800/50 border border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-lime-400 text-neutral-950 font-display font-bold flex items-center justify-center">{n}</div>
                  <span className="text-sm font-semibold">Cancha {n}</span>
                </div>
                <button className="text-neutral-500 hover:text-neutral-100"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h3 className="font-display text-sm tracking-wide font-bold">HORARIOS</h3>
          </div>
          <div className="space-y-2">
            {['10:00', '11:30', '13:00'].map(h => (
              <div key={h} className="flex items-center justify-between p-3 bg-neutral-800/50 border border-neutral-800">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="font-mono">{h}</span>
                </div>
                <button className="text-neutral-500 hover:text-neutral-100"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button className="w-full p-3 border border-dashed border-neutral-700 text-neutral-500 hover:border-lime-400 hover:text-lime-400 text-xs flex items-center justify-center gap-2 font-bold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar horario
            </button>
          </div>
        </div>
      </div>

      {/* Fases */}
      <div className="bg-neutral-900 border border-neutral-800">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="font-display text-sm tracking-wide font-bold">FASES DEL TORNEO</h3>
          <button className="bg-lime-400 text-neutral-950 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-lime-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nueva Fase
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {phases.map((p, i) => (
              <React.Fragment key={p.id}>
                <div className={`min-w-[220px] p-4 border ${
                  p.status === 'active' ? 'border-lime-400 bg-lime-400/5' : 'border-neutral-800 bg-neutral-900'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-[10px] text-neutral-500 tracking-widest font-bold">FASE {i + 1}</div>
                    {p.status === 'active' && <div className="px-1.5 py-0.5 bg-lime-400 text-neutral-950 text-[9px] font-bold">ACTIVA</div>}
                  </div>
                  <div className="font-display text-base mb-2 font-bold">{p.name}</div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    {p.type === 'groups' && (
                      <>
                        <div className="flex items-center gap-1"><Hash className="w-3 h-3" /> {p.zones} zonas</div>
                        <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.teamsPerZone} equipos c/u</div>
                      </>
                    )}
                    {p.type === 'bracket' && (
                      <div className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {p.teams} equipos</div>
                    )}
                  </div>
                </div>
                {i < phases.length - 1 && <ChevronRight className="w-5 h-5 text-neutral-600 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
