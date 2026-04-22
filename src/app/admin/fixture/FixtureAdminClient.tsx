'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap, CalendarDays, MapPin, Eye, ChevronDown, ChevronRight,
  AlertCircle, Check, Clock, RefreshCw, Plus,
} from 'lucide-react';
import { generateGroupFixture } from '@/lib/actions/matches';
import type { FixturePageData, MatchRow, GroupWithTeams } from './page';

type Props = { data: FixturePageData };

export function FixtureAdminClient({ data }: Props) {
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');
  const [filterGroupId, setFilterGroupId] = useState<string | 'all'>('all');
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]));
  const [generateModal, setGenerateModal] = useState<GroupWithTeams | null>(null);

  const rounds = useMemo(() => {
    const nums = [...new Set(data.matches.map(m => m.round_number))].sort((a, b) => a - b);
    return nums;
  }, [data.matches]);

  const filtered = useMemo(() => {
    return data.matches.filter(m => {
      if (filterRound !== 'all' && m.round_number !== filterRound) return false;
      if (filterGroupId !== 'all' && m.group?.id !== filterGroupId) return false;
      return true;
    });
  }, [data.matches, filterRound, filterGroupId]);

  const matchesByRound = useMemo(() => {
    const map: Record<number, MatchRow[]> = {};
    for (const m of filtered) {
      if (!map[m.round_number]) map[m.round_number] = [];
      map[m.round_number].push(m);
    }
    return map;
  }, [filtered]);

  const toggleRound = (r: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  };

  const groupsWithoutMatches = data.groups.filter(g => g.team_count >= 2 && g.match_count === 0);
  const groupsWithMatches = data.groups.filter(g => g.match_count > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Fixture · {data.tournamentName}</div>
          <div className="font-serif font-bold text-xl mt-0.5">
            {data.matches.length} partidos
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {data.matches.filter(m => m.status === 'played').length} jugados ·{' '}
            {data.matches.filter(m => m.status === 'scheduled').length} pendientes
          </div>
        </div>
        {data.groups.length > 0 && (
          <button
            onClick={() => setGenerateModal(data.groups[0])}
            className="bg-blue-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-800 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" /> Generar fixture
          </button>
        )}
      </div>

      {/* Aviso grupos sin fixture */}
      {groupsWithoutMatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-amber-900 mb-2">
                {groupsWithoutMatches.length === 1
                  ? 'Esta zona todavía no tiene fixture generado:'
                  : 'Estas zonas todavía no tienen fixture generado:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {groupsWithoutMatches.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGenerateModal(g)}
                    className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 text-xs font-medium hover:bg-amber-200 transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    {g.phase_name} · Zona {g.name} ({g.team_count} equipos)
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regenerar zonas existentes */}
      {groupsWithMatches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groupsWithMatches.map(g => (
            <button
              key={g.id}
              onClick={() => setGenerateModal(g)}
              className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerar Zona {g.name}
            </button>
          ))}
        </div>
      )}

      {data.matches.length === 0 ? (
        <div className="bg-white border border-slate-200 p-16 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
          <div className="font-serif font-bold text-base mb-1">Sin partidos</div>
          <div className="text-xs text-slate-500">
            Generá el fixture con el botón de arriba para crear los partidos de cada zona.
          </div>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white border border-slate-200 p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <FilterPill label="TODAS" active={filterRound === 'all'} onClick={() => setFilterRound('all')} />
              {rounds.map(r => (
                <FilterPill key={r} label={`F${r}`} active={filterRound === r} onClick={() => setFilterRound(r)} />
              ))}
            </div>
            {data.groups.length > 1 && (
              <select
                value={filterGroupId}
                onChange={e => setFilterGroupId(e.target.value)}
                className="border border-slate-200 px-3 py-1 text-xs bg-white focus:outline-none focus:border-blue-700 font-mono"
              >
                <option value="all">Todas las zonas</option>
                {data.groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.phase_name} · Zona {g.name}
                  </option>
                ))}
              </select>
            )}
            <span className="ml-auto text-xs text-slate-400 font-mono">
              {filtered.length} partido{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Rounds */}
          <div className="space-y-3">
            {Object.entries(matchesByRound)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([round, roundMatches]) => {
                const r = Number(round);
                const expanded = expandedRounds.has(r);
                const played = roundMatches.filter(m => m.status === 'played').length;
                const firstDate = roundMatches[0]?.match_date;

                return (
                  <div key={r} className="bg-white border border-slate-200">
                    <button
                      onClick={() => toggleRound(r)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-900 text-white font-display font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {r}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-left">Fecha {r}</div>
                          {firstDate && (
                            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest text-left">
                              {formatDate(firstDate)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">
                          {played}/{roundMatches.length} jugados
                        </span>
                        {played === roundMatches.length && roundMatches.length > 0 && (
                          <span className="text-[9px] font-mono font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 uppercase">
                            Completa
                          </span>
                        )}
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-slate-100 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {roundMatches.map(m => (
                            <MatchCard key={m.id} match={m} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Generate Modal */}
      {generateModal && (
        <GenerateModal
          group={generateModal}
          groups={data.groups}
          onChangeGroup={id => setGenerateModal(data.groups.find(g => g.id === id) ?? null)}
          onClose={() => setGenerateModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: MatchRow }) {
  const played = match.status === 'played';
  const homeWon = played && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWon = played && (match.away_score ?? 0) > (match.home_score ?? 0);

  return (
    <Link
      href={`/admin/fixture/${match.id}`}
      className="block border border-slate-200 hover:border-blue-700 hover:shadow-sm transition-all p-4 group"
    >
      {/* Teams + Score */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <TeamRow team={match.home_team} bold={homeWon} />
          <TeamRow team={match.away_team} bold={awayWon} />
        </div>
        <div className="flex-shrink-0 text-center min-w-[48px]">
          {played ? (
            <div className="font-display text-2xl font-bold text-blue-900 leading-none">
              {match.home_score}–{match.away_score}
            </div>
          ) : (
            <div className="font-mono text-sm text-slate-400">
              <span className="block">—</span>
              <span className="block">—</span>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 flex-wrap">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> C.{match.field_number}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {match.match_time}
        </span>
        {match.group && (
          <span className="bg-slate-100 px-1.5 py-0.5 uppercase tracking-wider">
            Z.{match.group.name}
          </span>
        )}
        {match.observer_team && (
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {match.observer_team.short_name}
          </span>
        )}
        <span className="ml-auto">
          {played ? (
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <Check className="w-3 h-3" /> JUGADO
            </span>
          ) : (
            <span className="text-blue-700 font-semibold group-hover:text-blue-900">EDITAR →</span>
          )}
        </span>
      </div>
    </Link>
  );
}

function TeamRow({ team, bold }: { team: MatchRow['home_team']; bold: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2.5 h-2.5 flex-shrink-0"
        style={{ backgroundColor: team?.color ?? '#94a3b8' }}
      />
      <span className={`text-sm truncate ${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
        {team?.name ?? '—'}
      </span>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-[10px] font-mono tracking-wider font-semibold transition-colors ${
        active ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Modal
// ─────────────────────────────────────────────────────────────────────────────

function GenerateModal({
  group, groups, onChangeGroup, onClose,
}: {
  group: GroupWithTeams;
  groups: GroupWithTeams[];
  onChangeGroup: (id: string) => void;
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [doubleRound, setDoubleRound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasPlayed = group.match_count > 0;

  const handleGenerate = () => {
    if (!startDate) { setError('Ingresá una fecha de inicio.'); return; }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('group_id', group.id);
      fd.append('start_date', startDate);
      fd.append('double_round_robin', doubleRound.toString());
      const result = await generateGroupFixture(fd);
      if (!result.success) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
      onClick={() => !isPending && onClose()}
    >
      <div
        className="bg-white w-full max-w-md border border-slate-200 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-blue-900 p-5 text-white">
          <div className="font-mono text-[10px] tracking-widest opacity-80 mb-1">GENERAR FIXTURE</div>
          <div className="font-serif font-bold text-lg">
            {group.phase_name} · Zona {group.name}
          </div>
          <div className="text-xs text-blue-200 mt-1">{group.team_count} equipos</div>
        </div>

        <div className="p-6 space-y-4">
          {groups.length > 1 && (
            <div>
              <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                Zona
              </label>
              <select
                value={group.id}
                onChange={e => onChangeGroup(e.target.value)}
                disabled={isPending}
                className="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-700"
              >
                {groups.filter(g => g.team_count >= 2).map(g => (
                  <option key={g.id} value={g.id}>
                    {g.phase_name} · Zona {g.name} ({g.team_count} equipos)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
              Fecha de inicio <span className="text-orange-600">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              disabled={isPending}
              className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-700"
            />
            <div className="text-[10px] text-slate-400 mt-1">
              Las fechas siguientes se programan cada 7 días.
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={doubleRound}
              onChange={e => setDoubleRound(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 accent-blue-900"
            />
            <div>
              <div className="text-sm font-medium">Doble vuelta</div>
              <div className="text-[10px] text-slate-400">Cada equipo juega dos veces contra cada rival.</div>
            </div>
          </label>

          {hasPlayed && (
            <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                Esta zona ya tiene {group.match_count} partido(s).
                Los partidos ya jugados no se borrarán, pero los pendientes sí se reemplazarán.
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 flex justify-end gap-2 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isPending}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={isPending || !startDate || group.team_count < 2}
            className="bg-blue-900 text-white px-5 py-2 text-sm font-medium hover:bg-blue-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5" />
            {isPending ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>
    </div>
  );
}
