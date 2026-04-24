'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type StandingRow = {
  team_id: string;
  team_name: string;
  color: string;
  group_name: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

type GroupTable = {
  id: string;
  name: string;
  rows: StandingRow[];
};

type PhaseTable = {
  id: string;
  name: string;
  type: 'groups' | 'bracket';
  groups: GroupTable[];
};

type QualificationStyle = {
  label: string;
  mobileBar: string;
  desktopBar: string;
  badge: string;
};

const PHASE_ONE_LEGEND: QualificationStyle[] = [
  { label: 'Zona 1', mobileBar: 'bg-emerald-500', desktopBar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  { label: 'Zona 2', mobileBar: 'bg-amber-500', desktopBar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { label: 'Zona 3', mobileBar: 'bg-sky-500', desktopBar: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border border-sky-200' },
];

const PHASE_TWO_LEGEND: QualificationStyle[] = [
  { label: 'Copa de Oro', mobileBar: 'bg-yellow-500', desktopBar: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-800 border border-yellow-200' },
  { label: 'Copa de Plata', mobileBar: 'bg-slate-400', desktopBar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border border-slate-200' },
  { label: 'Copa de Bronce', mobileBar: 'bg-amber-700', desktopBar: 'bg-amber-700', badge: 'bg-amber-50 text-amber-800 border border-amber-200' },
];

function normalizeZoneName(groupName?: string | null) {
  const normalized = (groupName ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === '1' || normalized === '2' || normalized === '3') return `zona ${normalized}`;
  return normalized;
}

function isPhaseTwoZone(groupName?: string | null) {
  const normalized = normalizeZoneName(groupName);
  return normalized === 'zona 1' || normalized === 'zona 2' || normalized === 'zona 3';
}

function getPhaseOneQualification(index: number): QualificationStyle {
  if (index < 4) return PHASE_ONE_LEGEND[0];
  if (index < 8) return PHASE_ONE_LEGEND[1];
  return PHASE_ONE_LEGEND[2];
}

function getPhaseTwoQualification(groupName: string, index: number): QualificationStyle {
  const normalized = normalizeZoneName(groupName);
  if (normalized === 'zona 1') {
    if (index < 5) return PHASE_TWO_LEGEND[0];
    if (index < 7) return PHASE_TWO_LEGEND[1];
    return PHASE_TWO_LEGEND[2];
  }
  if (normalized === 'zona 2') {
    if (index < 2) return PHASE_TWO_LEGEND[0];
    if (index < 6) return PHASE_TWO_LEGEND[1];
    return PHASE_TWO_LEGEND[2];
  }
  if (normalized === 'zona 3') {
    if (index < 1) return PHASE_TWO_LEGEND[0];
    if (index < 3) return PHASE_TWO_LEGEND[1];
    return PHASE_TWO_LEGEND[2];
  }
  return getPhaseOneQualification(index);
}

function getQualification(groupName: string, index: number): QualificationStyle {
  return isPhaseTwoZone(groupName) ? getPhaseTwoQualification(groupName, index) : getPhaseOneQualification(index);
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 p-3 text-center shadow-sm">
      <div className="font-display text-2xl leading-none text-blue-900">{value}</div>
      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-1.5">{label}</div>
    </div>
  );
}

export function StandingsClient({ phases }: { phases: PhaseTable[] }) {
  const [phaseId, setPhaseId] = useState(phases[0]?.id ?? '');
  const activePhase = phases.find((phase) => phase.id === phaseId) ?? phases[0];
  const [groupId, setGroupId] = useState(activePhase?.groups[0]?.id ?? '');
  const activeGroup = activePhase.groups.find((group) => group.id === groupId) ?? activePhase.groups[0];

  const totals = useMemo(() => {
    const rows = activeGroup?.rows ?? [];
    return {
      goles: rows.reduce((sum, row) => sum + row.gf, 0),
      partidos: Math.floor(rows.reduce((sum, row) => sum + row.pj, 0) / 2),
      equipos: rows.length,
    };
  }, [activeGroup]);

  const showQualification = activePhase.type === 'groups';
  const legend = activeGroup ? (isPhaseTwoZone(activeGroup.name) ? PHASE_TWO_LEGEND : PHASE_ONE_LEGEND) : [];

  if (activePhase.type === 'bracket') {
    return (
      <div>
        <div className="bg-white border-b border-slate-200 p-3 space-y-2 sticky top-14 z-20 md:top-[96px]">
          <div className="flex gap-1 overflow-x-auto hide-scroll -mx-3 px-3 pb-1">
            {phases.map((phase) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => {
                  setPhaseId(phase.id);
                  setGroupId(phase.groups[0]?.id ?? '');
                }}
                className={`flex-shrink-0 px-3 h-8 font-display text-sm ${
                  activePhase.id === phase.id ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {phase.name}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
          <div className="bg-white border border-slate-200 p-5 md:p-6">
            <div className="font-display text-2xl text-slate-900 mb-1">Fase eliminatoria</div>
            <div className="text-sm text-slate-500">
              Esta fase no usa tabla de posiciones. RevisÃ¡ la llave completa y el resumen por copa.
            </div>
            <div className="mt-4">
              <Link href="/bracket" className="inline-flex items-center bg-blue-900 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-800 transition-colors">
                Ver bracket
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {activePhase.groups.map((cup) => {
              const played = cup.rows.reduce((sum, row) => sum + row.pj, 0) / 2;
              const goals = cup.rows.reduce((sum, row) => sum + row.gf, 0);
              const teams = cup.rows.length;
              return (
                <div key={cup.id} className="bg-white border border-slate-200 p-5 shadow-sm">
                  <div className="font-display text-xl text-slate-900 mb-1">{cup.name}</div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <MiniStat label="Equipos" value={teams} />
                    <MiniStat label="PJ" value={Math.floor(played)} />
                    <MiniStat label="Goles" value={goals} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {cup.rows.slice(0, 4).map((team) => (
                      <Link
                        key={team.team_id}
                        href={`/team/${team.team_id}`}
                        className="flex items-center justify-between gap-3 border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: team.color || '#94a3b8' }} />
                          <span className="text-sm font-medium text-slate-800 truncate">{team.team_name}</span>
                        </div>
                        <span className="font-mono text-xs text-slate-500">{team.pg}G {team.pe}E {team.pp}P</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border-b border-slate-200 p-3 space-y-2 sticky top-14 z-20 md:top-[96px]">
        <div className="flex gap-1 overflow-x-auto hide-scroll -mx-3 px-3 pb-1">
          {phases.map((phase) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => {
                setPhaseId(phase.id);
                setGroupId(phase.groups[0]?.id ?? '');
              }}
              className={`flex-shrink-0 px-3 h-8 font-display text-sm ${
                activePhase.id === phase.id ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {phase.name}
            </button>
          ))}
        </div>

        <div className="flex gap-1 overflow-x-auto hide-scroll">
          {activePhase.groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setGroupId(group.id)}
              className={`px-2 py-1 text-[10px] font-mono tracking-wider whitespace-nowrap ${
                activeGroup.id === group.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {group.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="md:hidden p-3 space-y-2">
        {showQualification && (
          <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-1 px-1 flex-wrap">
            {legend.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={`w-2 h-2 ${item.mobileBar}`} />
                {item.label}
              </div>
            ))}
          </div>
        )}

        {activeGroup.rows.map((team, index) => {
          const qualification = showQualification ? getQualification(activeGroup.name, index) : null;
          return (
            <Link
              key={team.team_id}
              href={`/team/${team.team_id}`}
              className="w-full bg-white border border-slate-200 flex items-center gap-3 overflow-hidden shadow-sm hover:border-blue-700 transition-colors"
            >
              <div className="w-12 self-stretch flex items-center justify-center font-display text-xl text-white bg-slate-400" style={{ minHeight: '68px' }}>
                {index + 1}
              </div>

              <div className="flex-1 py-3 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: team.color || '#94a3b8' }} />
                  <div className="font-semibold text-sm truncate text-slate-900">{team.team_name}</div>
                </div>

                {qualification && (
                  <div className="mb-1">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${qualification.badge}`}>
                      {qualification.label}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-mono font-medium">{team.pj} PJ</span>
                  <span className="text-slate-300">Â·</span>
                  <span className="font-mono text-emerald-600 font-semibold">{team.pg}G</span>
                  <span className="font-mono text-slate-400 font-semibold">{team.pe}E</span>
                  <span className="font-mono text-red-500 font-semibold">{team.pp}P</span>
                  <span className="text-slate-300">Â·</span>
                  <span className="font-mono font-medium">{team.dg > 0 ? '+' : ''}{team.dg}</span>
                </div>
              </div>

              <div className="pr-4 text-right flex-shrink-0">
                <div className="font-display text-2xl text-blue-900 leading-none">{team.pts}</div>
                <div className="font-mono text-[9px] text-slate-400 mt-1 uppercase tracking-widest">PTS</div>
              </div>

              {qualification && <div className={`w-1.5 self-stretch ${qualification.mobileBar}`} style={{ minHeight: '68px' }} />}
            </Link>
          );
        })}

        <div className="grid grid-cols-3 gap-2 pt-2">
          <MiniStat label="Goles" value={totals.goles} />
          <MiniStat label="Partidos" value={totals.partidos} />
          <MiniStat label="Equipos" value={totals.equipos} />
        </div>
      </div>

      <div className="hidden md:block max-w-6xl mx-auto px-8 py-8">
        {showQualification && (
          <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-6 font-medium flex-wrap">
            {legend.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 ${item.desktopBar}`} />
                {item.label}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 bg-blue-900">
            <div className="font-display text-lg text-white">{activeGroup.name.toUpperCase()}</div>
          </div>

          <table className="w-full">
            <thead className="text-[10px] font-mono text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="text-left px-5 py-2.5 w-8">#</th>
                <th className="text-left py-2.5">Equipo</th>
                {showQualification && <th className="text-left py-2.5 w-36">Destino</th>}
                <th className="text-center py-2.5 w-10">PJ</th>
                <th className="text-center py-2.5 w-10">PG</th>
                <th className="text-center py-2.5 w-10">PE</th>
                <th className="text-center py-2.5 w-10">PP</th>
                <th className="text-center py-2.5 w-12">GF</th>
                <th className="text-center py-2.5 w-12">GC</th>
                <th className="text-center py-2.5 w-12">DG</th>
                <th className="text-center py-2.5 pr-5 w-14">PTS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {activeGroup.rows.map((team, index) => {
                const qualification = showQualification ? getQualification(activeGroup.name, index) : null;
                return (
                  <tr key={team.team_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="w-6 h-6 flex items-center justify-center text-xs font-display font-bold text-slate-600">
                        {index + 1}
                      </div>
                    </td>

                    <td className="py-3">
                      <Link href={`/team/${team.team_id}`} className="flex items-center gap-2 hover:text-blue-700">
                        {qualification && <div className={`w-1 self-stretch ${qualification.desktopBar}`} style={{ minHeight: '20px' }} />}
                        <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ background: team.color || '#94a3b8' }} />
                        <span className="font-semibold text-sm text-slate-800">{team.team_name}</span>
                      </Link>
                    </td>

                    {showQualification && (
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${qualification!.badge}`}>
                          {qualification!.label}
                        </span>
                      </td>
                    )}

                    <td className="text-center font-mono text-sm py-3">{team.pj}</td>
                    <td className="text-center font-mono text-sm py-3 text-emerald-600 font-semibold">{team.pg}</td>
                    <td className="text-center font-mono text-sm py-3 text-slate-500">{team.pe}</td>
                    <td className="text-center font-mono text-sm py-3 text-red-500 font-semibold">{team.pp}</td>
                    <td className="text-center font-mono text-sm py-3">{team.gf}</td>
                    <td className="text-center font-mono text-sm py-3">{team.gc}</td>
                    <td className="text-center font-mono text-sm py-3">{team.dg > 0 ? '+' : ''}{team.dg}</td>
                    <td className="text-center pr-5 py-3">
                      <span className="font-display text-xl text-blue-900">{team.pts}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8 max-w-sm">
          <MiniStat label="Goles" value={totals.goles} />
          <MiniStat label="Partidos" value={totals.partidos} />
          <MiniStat label="Equipos" value={totals.equipos} />
        </div>
      </div>
    </div>
  );
}
