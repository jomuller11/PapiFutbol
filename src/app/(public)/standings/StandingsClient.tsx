'use client';

import { useState, useMemo } from 'react';
import { ArrowUp, Minus } from 'lucide-react';
import Link from 'next/link';

export function StandingsClient({ rows, groups }: { rows: any[], groups: any[] }) {
  const defaultZone = groups.length > 0 ? groups[0].name : 'all';
  const [zone, setZone] = useState(defaultZone);

  const filteredRows = useMemo(() => {
    if (zone === 'all') return rows;
    return rows.filter(r => r.group_name === zone || r.group_name?.includes(zone));
  }, [rows, zone]);

  const totalGoles = filteredRows.reduce((a, t) => a + t.gf, 0);
  const totalPartidos = filteredRows.reduce((a, t) => a + t.pj, 0) / 2;
  const totalEquipos = filteredRows.length;

  // Group all rows by their group for the desktop multi-column view
  const rowsByGroup = useMemo(() => {
    if (groups.length === 0) return [{ groupName: 'Todos', rows }];
    const map = new Map<string, any[]>();
    for (const g of groups) {
      const gRows = rows.filter(r => r.group_name === g.name || r.group_name?.includes(g.name));
      if (gRows.length > 0) map.set(g.name, gRows);
    }
    return Array.from(map.entries()).map(([groupName, rows]) => ({ groupName, rows }));
  }, [rows, groups]);

  return (
    <div>
      {/* Zone filter tabs */}
      {groups.length > 0 && (
        <div className="bg-white border-b border-slate-200 p-3 flex gap-1 sticky top-14 z-20 md:top-[96px]">
          {groups.map((g) => {
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

      {/* ── MOBILE: Card list ──────────────────────── */}
      <div className="md:hidden p-3 space-y-2">
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-1 px-1">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500" />Clasifica</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500" />Repechaje</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300" />Eliminado</div>
        </div>

        {filteredRows.map((t, i) => {
          const status = i < 4 ? 'clasifica' : i < 8 ? 'repechaje' : 'eliminado';
          return (
            <Link
              key={t.team_id}
              href={`/team/${t.team_id}`}
              className="w-full bg-white border border-slate-200 flex items-center gap-3 overflow-hidden shadow-sm hover:border-blue-700 transition-colors"
            >
              <div className={`w-12 self-stretch flex items-center justify-center font-display text-xl text-white ${
                i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : 'bg-slate-300'
              }`} style={{ minHeight: '68px' }}>
                {i + 1}
              </div>
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
              <div className="flex items-center flex-shrink-0">
                {t.pts > 0 && i < 2 ? <ArrowUp className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-slate-300" />}
              </div>
              <div className="pr-4 text-right flex-shrink-0">
                <div className="font-display text-2xl text-blue-900 leading-none">{t.pts}</div>
                <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">PTS</div>
              </div>
              <div className={`w-1.5 self-stretch ${
                status === 'clasifica' ? 'bg-emerald-500' : status === 'repechaje' ? 'bg-amber-500' : 'bg-slate-300'
              }`} style={{ minHeight: '68px' }} />
            </Link>
          );
        })}

        {filteredRows.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            No hay equipos en esta zona aún.
          </div>
        )}

        {filteredRows.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <MiniStat label="Goles" value={totalGoles} color="orange" />
            <MiniStat label="Partidos" value={Math.floor(totalPartidos)} color="blue" />
            <MiniStat label="Equipos" value={totalEquipos} color="emerald" />
          </div>
        )}
      </div>

      {/* ── DESKTOP: Proper tables ─────────────────── */}
      <div className="hidden md:block max-w-6xl mx-auto px-8 py-8">
        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-6 font-medium">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500" />Clasifica</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500" />Repechaje</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300" />Eliminado</div>
        </div>

        {rowsByGroup.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm font-medium">
            No hay equipos en esta zona aún.
          </div>
        )}

        <div className={`grid gap-8 ${rowsByGroup.length >= 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
          {rowsByGroup.map(({ groupName, rows: groupRows }) => (
            <div key={groupName} className="bg-white border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200 bg-blue-900">
                <div className="font-display text-lg text-white">
                  {groupName.toUpperCase().startsWith('ZONA') ? groupName.toUpperCase() : `ZONA ${groupName.toUpperCase()}`}
                </div>
              </div>
              <table className="w-full">
                <thead className="text-[10px] font-mono text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-2.5 w-8">#</th>
                    <th className="text-left py-2.5">Equipo</th>
                    <th className="text-center py-2.5 w-10">PJ</th>
                    <th className="text-center py-2.5 w-10">PG</th>
                    <th className="text-center py-2.5 w-10">PE</th>
                    <th className="text-center py-2.5 w-10">PP</th>
                    <th className="text-center py-2.5 w-12">DG</th>
                    <th className="text-center py-2.5 pr-5 w-14">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupRows.map((t, i) => {
                    const isClassify = i < 4;
                    const isRepechaje = i >= 4 && i < 8;
                    return (
                      <tr
                        key={t.team_id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className={`w-6 h-6 flex items-center justify-center text-xs font-display font-bold ${
                            i === 0 ? 'bg-orange-500 text-white' :
                            i === 1 ? 'bg-slate-300 text-slate-800' :
                            i === 2 ? 'bg-amber-600 text-white' :
                            'text-slate-400'
                          }`}>
                            {i + 1}
                          </div>
                        </td>
                        <td className="py-3">
                          <Link href={`/team/${t.team_id}`} className="flex items-center gap-2 hover:text-blue-700">
                            <div className={`w-1 self-stretch ${isClassify ? 'bg-emerald-500' : isRepechaje ? 'bg-amber-500' : 'bg-slate-200'}`} style={{ minHeight: '20px' }} />
                            <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ background: t.color || '#94a3b8' }} />
                            <span className="font-semibold text-sm text-slate-800">{t.team_name}</span>
                          </Link>
                        </td>
                        <td className="text-center font-mono text-sm py-3">{t.pj}</td>
                        <td className="text-center font-mono text-sm py-3 text-emerald-600 font-semibold">{t.pg}</td>
                        <td className="text-center font-mono text-sm py-3 text-slate-500">{t.pe}</td>
                        <td className="text-center font-mono text-sm py-3 text-red-500 font-semibold">{t.pp}</td>
                        <td className="text-center font-mono text-sm py-3">{t.dg > 0 ? '+' : ''}{t.dg}</td>
                        <td className="text-center pr-5 py-3">
                          <span className="font-display text-xl text-blue-900">{t.pts}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mt-8 max-w-sm">
          <MiniStat label="Goles" value={rows.reduce((a, t) => a + t.gf, 0)} color="orange" />
          <MiniStat label="Partidos" value={Math.floor(rows.reduce((a, t) => a + t.pj, 0) / 2)} color="blue" />
          <MiniStat label="Equipos" value={rows.length} color="emerald" />
        </div>
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
