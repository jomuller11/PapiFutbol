'use client';

import { useState, useTransition } from 'react';
import { Search, UserPlus, X, Crown, AlertCircle } from 'lucide-react';
import { addTeamMember, removeTeamMember, updateTeamMember } from '@/lib/actions/teams';
import type { TeamWithRoster, AvailablePlayer } from '@/app/admin/teams/page';

type Props = {
  teamId: string;
  members: TeamWithRoster['members'];
  availablePlayers: AvailablePlayer[];
};

export function RosterPanel({ teamId, members, availablePlayers }: Props) {
  const [search, setSearch] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = availablePlayers.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${p.first_name} ${p.last_name} ${p.nickname ?? ''} ${p.dni}`.toLowerCase().includes(q);
  });

  const handleAdd = (playerId: string) => {
    setAddError(null);
    setActiveId(playerId);
    const fd = new FormData();
    fd.append('team_id', teamId);
    fd.append('player_id', playerId);
    startTransition(async () => {
      const result = await addTeamMember(fd);
      setActiveId(null);
      if (!result.success) setAddError(result.error);
    });
  };

  const handleRemove = (membershipId: string) => {
    setActionError(null);
    setActiveId(membershipId);
    startTransition(async () => {
      const result = await removeTeamMember(membershipId);
      setActiveId(null);
      if (!result.success) setActionError(result.error);
    });
  };

  const handleToggleCaptain = (membershipId: string, isCaptain: boolean) => {
    setActionError(null);
    setActiveId(membershipId);
    const fd = new FormData();
    fd.append('membership_id', membershipId);
    fd.append('is_captain', (!isCaptain).toString());
    startTransition(async () => {
      const result = await updateTeamMember(fd);
      setActiveId(null);
      if (!result.success) setActionError(result.error);
    });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Plantel actual */}
      <div>
        <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2 flex items-center justify-between">
          <span>Plantel actual</span>
          <span className="text-slate-400 normal-case font-normal text-[10px]">
            {members.length} jugador{members.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 flex items-start gap-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {members.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            Todavía no hay jugadores en el plantel.
          </div>
        ) : (
          <div className="max-h-52 overflow-y-auto border border-slate-200 divide-y divide-slate-100">
            {members.map(m => {
              const busy = activeId === m.membership_id && isPending;
              return (
                <div
                  key={m.membership_id}
                  className={`flex items-center gap-2 px-3 py-2 text-xs transition-opacity ${busy ? 'opacity-40' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (m.first_name[0] ?? '') + (m.last_name[0] ?? '')
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      {m.first_name} {m.last_name}
                      {m.nickname && (
                        <span className="text-slate-400 font-normal ml-1">"{m.nickname}"</span>
                      )}
                    </div>
                    <div className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                      {m.position ?? '—'}
                      {m.jersey_number != null ? ` · #${m.jersey_number}` : ''}
                    </div>
                  </div>

                  {m.is_captain && (
                    <span className="font-mono text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 font-semibold flex-shrink-0">
                      CAP
                    </span>
                  )}

                  <button
                    onClick={() => handleToggleCaptain(m.membership_id, m.is_captain)}
                    disabled={isPending}
                    title={m.is_captain ? 'Quitar capitán' : 'Hacer capitán'}
                    className={`w-6 h-6 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 ${
                      m.is_captain
                        ? 'text-amber-500 hover:text-amber-700'
                        : 'text-slate-300 hover:text-amber-400'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRemove(m.membership_id)}
                    disabled={isPending}
                    title="Quitar del plantel"
                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Jugadores disponibles */}
      <div>
        <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2 flex items-center justify-between">
          <span>Jugadores disponibles</span>
          <span className="text-slate-400 normal-case font-normal text-[10px]">
            {availablePlayers.length} sin equipo
          </span>
        </div>

        {addError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 flex items-start gap-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{addError}</span>
          </div>
        )}

        {availablePlayers.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No hay jugadores aprobados sin equipo asignado.
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">Sin resultados.</div>
            ) : (
              <div className="max-h-52 overflow-y-auto border border-slate-200 divide-y divide-slate-100">
                {filtered.map(p => {
                  const busy = activeId === p.id && isPending;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 px-3 py-2 text-xs transition-opacity ${busy ? 'opacity-40' : ''}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (p.first_name[0] ?? '') + (p.last_name[0] ?? '')
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate">
                          {p.first_name} {p.last_name}
                          {p.nickname && (
                            <span className="text-slate-400 font-normal ml-1">"{p.nickname}"</span>
                          )}
                        </div>
                        <div className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                          {p.position ?? '—'} · DNI {p.dni}
                        </div>
                      </div>

                      {p.score != null && (
                        <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 flex-shrink-0">
                          {p.score}pts
                        </span>
                      )}

                      <button
                        onClick={() => handleAdd(p.id)}
                        disabled={isPending}
                        title="Agregar al plantel"
                        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-blue-700 transition-colors flex-shrink-0 disabled:opacity-40"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
