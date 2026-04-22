'use client';

import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import Link from 'next/link';

export function StandingsClient({ rows, groups }: { rows: any[], groups: any[] }) {
  // Try to find first group as default or use 'all'
  const defaultZone = groups.length > 0 ? groups[0].name : 'all';
  const [zone, setZone] = useState(defaultZone);

  const filteredRows = useMemo(() => {
    if (zone === 'all') return rows;
    return rows.filter(r => r.group_name === zone || r.group_name?.includes(zone));
  }, [rows, zone]);

  const totalGoles = filteredRows.reduce((a, t) => a + t.gf, 0);
  const totalPartidos = filteredRows.reduce((a, t) => a + t.pj, 0) / 2;
  const totalEquipos = filteredRows.length;

  return (
    <div>
      {/* Filtros de Zona */}
      {groups.length > 0 && (
        <div className="bg-white border-b border-slate-200 p-3 flex gap-1 sticky top-14 z-20 md:top-[56px]">
          {groups.map((g) => {
            // Usually "Zona A" or "A"
            const label = g.name.toUpperCase();
            return (
              <button 
                key={g.id} 
                onClick={() => setZone(g.name)} 
                className={`flex-1 py-2 font-display text-base ${zone === g.name ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Leyenda */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-1 px-1">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500" />Clasifica</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500" />Repechaje</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300" />Eliminado</div>
        </div>

        {/* Filas */}
        {filteredRows.map((t, i) => {
          const status = i < 4 ? 'clasifica' : i < 8 ? 'repechaje' : 'eliminado';
          
          return (
            <div
              key={t.team_id}
              className="w-full bg-white border border-slate-200 flex items-center gap-3 overflow-hidden shadow-sm hover:border-blue-700 transition-colors"
            >
              {/* Ranking badge */}
              <div className={`w-12 self-stretch flex items-center justify-center font-display text-xl text-white ${
                i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : 'bg-slate-300'
              }`} style={{ minHeight: '68px' }}>
                {i + 1}
              </div>

              {/* Info principal */}
              <div className="flex-1 py-3 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: t.color || '#94a3b8' }} />
                  <div className="font-semibold text-sm truncate text-slate-900">{t.team_name}</div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-mono font-medium">{t.pj} PJ</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-emerald-600 font-semibold">{t.pg}G</span>
                  <span className="font-mono text-slate-400 font-semibold">{t.pe}E</span>
                  <span className="font-mono text-red-500 font-semibold">{t.pp}P</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono font-medium">{t.dg > 0 ? '+' : ''}{t.dg}</span>
                </div>
              </div>

              {/* Tendencia (simulada por ahora) */}
              <div className="flex items-center flex-shrink-0">
                {t.pts > 0 && i < 2 ? <ArrowUp className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-slate-300" />}
              </div>

              {/* Puntos */}
              <div className="pr-4 text-right flex-shrink-0">
                <div className="font-display text-2xl text-blue-900 leading-none">{t.pts}</div>
                <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">PTS</div>
              </div>

              {/* Barra de status a la derecha */}
              <div className={`w-1.5 self-stretch ${
                status === 'clasifica' ? 'bg-emerald-500' : status === 'repechaje' ? 'bg-amber-500' : 'bg-slate-300'
              }`} style={{ minHeight: '68px' }} />
            </div>
          );
        })}

        {filteredRows.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            No hay equipos en esta zona aún.
          </div>
        )}

        {/* Stats de la zona */}
        {filteredRows.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <MiniStat label="Goles" value={totalGoles} color="orange" />
            <MiniStat label="Partidos" value={Math.floor(totalPartidos)} color="blue" />
            <MiniStat label="Equipos" value={totalEquipos} color="emerald" />
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string, value: number, color: 'orange' | 'blue' | 'emerald' }) {
  const colors = { 
    orange: 'text-orange-500', 
    blue: 'text-blue-900', 
    emerald: 'text-emerald-600' 
  };
  return (
    <div className="bg-white border border-slate-200 p-3 text-center shadow-sm">
      <div className={`font-display text-2xl leading-none ${colors[color]}`}>{value}</div>
      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-1.5">{label}</div>
    </div>
  );
}
