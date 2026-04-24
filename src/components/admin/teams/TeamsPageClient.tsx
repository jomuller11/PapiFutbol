'use client';

import { useState, useMemo } from 'react';
import {
  Search, Plus, Shield, Users, Star, Edit3, MapPin, Crown,
} from 'lucide-react';
import type { TeamsPageData, TeamWithRoster } from '@/app/admin/teams/page';
import { TeamEditor } from './TeamEditor';

type Props = {
  data: TeamsPageData;
};

export function TeamsPageClient({ data }: Props) {
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<'all' | 'unassigned' | string>('all');
  const [editingTeam, setEditingTeam] = useState<TeamWithRoster | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);

  const filtered = useMemo(() => {
    return data.teams.filter(t => {
      if (filterGroup === 'unassigned' && t.group_id) return false;
      if (filterGroup !== 'all' && filterGroup !== 'unassigned' && t.group_id !== filterGroup) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return `${t.name} ${t.short_name}`.toLowerCase().includes(q);
    });
  }, [data.teams, filterGroup, search]);

  const unassignedCount = data.teams.filter(t => !t.group_id).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-5 mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            Torneo activo
          </div>
          <div className="font-serif font-bold text-xl mt-0.5">{data.tournamentName}</div>
          <div className="text-xs text-slate-500 mt-1">
            {data.teams.length} {data.teams.length === 1 ? 'equipo' : 'equipos'} ·{' '}
            {data.availablePlayers.length} jugador
            {data.availablePlayers.length === 1 ? '' : 'es'} sin equipo ·{' '}
            {data.groups.length} {data.groups.length === 1 ? 'zona' : 'zonas'}
          </div>
        </div>
        <button
          onClick={() => setCreatingTeam(true)}
          className="bg-blue-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo equipo
        </button>
      </div>

      {/* Aviso si no hay zonas */}
      {data.groups.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 mb-4 flex items-start gap-3">
          <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <div className="font-semibold mb-0.5">Todavía no hay zonas creadas.</div>
            Los equipos se crearán sin zona asignada. Podés crear zonas desde{' '}
            <a href="/admin/tournament" className="underline font-medium">
              Configuración del torneo
            </a>{' '}
            y asignarlas después.
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 p-4 mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar equipo por nombre o sigla..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-700 focus:bg-white"
          />
        </div>
      </div>

      {/* Filtros por zona */}
      {data.groups.length > 0 && (
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          <FilterChip
            label="TODAS"
            active={filterGroup === 'all'}
            onClick={() => setFilterGroup('all')}
            count={data.teams.length}
          />
          {unassignedCount > 0 && (
            <FilterChip
              label="SIN ZONA"
              active={filterGroup === 'unassigned'}
              onClick={() => setFilterGroup('unassigned')}
              count={unassignedCount}
              amber
            />
          )}
          {data.groups.map(g => {
            const count = data.teams.filter(t => t.group_id === g.id).length;
            return (
              <FilterChip
                key={g.id}
                label={`ZONA ${g.name}`}
                active={filterGroup === g.id}
                onClick={() => setFilterGroup(g.id)}
                count={count}
              />
            );
          })}
        </div>
      )}

      {/* Grid de equipos */}
      {filtered.length === 0 ? (
        <EmptyState hadSearch={search.trim() !== ''} hasTeams={data.teams.length > 0} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={() => setEditingTeam(team)}
            />
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500 font-mono">
        {filtered.length} / {data.teams.length} equipos
      </div>

      {/* Modales */}
      <TeamEditor
        open={creatingTeam}
        onClose={() => setCreatingTeam(false)}
        tournamentId={data.tournamentId!}
        groups={data.groups}
      />
      <TeamEditor
        open={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        tournamentId={data.tournamentId!}
        groups={data.groups}
        team={editingTeam}
        availablePlayers={data.availablePlayers}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TeamCard({ team, onEdit }: { team: TeamWithRoster; onEdit: () => void }) {
  const captain = team.members.find(m => m.is_captain);

  return (
    <div className="bg-white border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
      {/* Header con color */}
      <div
        className="h-20 relative flex items-center justify-between px-4"
        style={{ backgroundColor: team.color }}
      >
        <div className="flex items-center gap-3">
          {team.logo_url ? (
            <div className="w-12 h-12 bg-white p-0.5 flex items-center justify-center overflow-hidden">
              <img
                src={team.logo_url}
                alt={team.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-white/20 border border-white/40 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
          )}
          <div className="text-white">
            <div className="font-serif font-bold text-base leading-tight drop-shadow-sm">
              {team.name}
            </div>
            <div className="font-mono text-[10px] tracking-widest opacity-90 mt-0.5">
              {team.short_name}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Editar"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Zona */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {team.group_name ? (
              <>
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                  {team.phase_name}
                </span>
                <span className="font-mono text-[10px] bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.5 font-semibold">
                  ZONA {team.group_name}
                </span>
              </>
            ) : (
              <span className="font-mono text-[10px] text-orange-600 font-semibold tracking-widest">
                SIN ZONA
              </span>
            )}
          </div>
        </div>

        {/* Plantel */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Users className="w-3 h-3" /> Plantel
            </span>
            <span className="font-serif font-bold text-sm">
              {team.roster_count}
              <span className="text-xs text-slate-400 font-mono ml-0.5">jugador{team.roster_count === 1 ? '' : 'es'}</span>
            </span>
          </div>

          {captain ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2 text-xs">
              <Crown className="w-3 h-3 text-amber-600 flex-shrink-0" />
              <span className="text-amber-900 font-medium truncate">
                Capitán: {captain.first_name} {captain.last_name}
              </span>
            </div>
          ) : team.roster_count > 0 ? (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <span className="font-mono text-[10px]">· sin capitán asignado</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              Todavía no hay jugadores.
            </div>
          )}

          {team.roster_count > 0 && (
            <div className="flex -space-x-1 mt-2">
              {team.members.slice(0, 6).map(m => (
                <div
                  key={m.membership_id}
                  className="w-6 h-6 bg-blue-100 text-blue-900 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-semibold"
                  title={`${m.first_name} ${m.last_name}`}
                >
                  {(m.first_name[0] ?? '') + (m.last_name[0] ?? '')}
                </div>
              ))}
              {team.roster_count > 6 && (
                <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-semibold">
                  +{team.roster_count - 6}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onEdit}
          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 text-xs font-medium hover:bg-slate-100 flex items-center justify-center gap-1.5"
        >
          <Edit3 className="w-3 h-3" /> Editar equipo y plantel
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  label, active, onClick, count, amber,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
  amber?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-[10px] font-mono tracking-wider font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
        active
          ? 'bg-blue-900 text-white'
          : amber
          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      <span
        className={`text-[9px] px-1 ${
          active ? 'bg-white/20' : amber ? 'bg-amber-200/60' : 'bg-slate-200/80'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ hadSearch, hasTeams }: { hadSearch: boolean; hasTeams: boolean }) {
  if (hadSearch) {
    return (
      <div className="bg-white border border-slate-200 p-12 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
        <div className="font-serif font-bold text-base mb-1">Sin resultados</div>
        <div className="text-xs text-slate-500">Ningún equipo coincide con tu búsqueda.</div>
      </div>
    );
  }

  if (!hasTeams) {
    return (
      <div className="bg-white border border-slate-200 p-12 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
        <div className="font-serif font-bold text-base mb-1">
          Todavía no hay equipos
        </div>
        <div className="text-xs text-slate-500">
          Creá el primero con el botón "Nuevo equipo" arriba.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-12 text-center">
      <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
      <div className="font-serif font-bold text-base mb-1">
        Sin equipos en este filtro
      </div>
      <div className="text-xs text-slate-500">
        Cambiá la zona seleccionada para ver otros equipos.
      </div>
    </div>
  );
}
