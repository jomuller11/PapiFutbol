'use client';

import { useState, useTransition } from 'react';
import { Shuffle, Zap, Check, AlertCircle, Users, Star } from 'lucide-react';
import { saveDraw } from '@/lib/actions/teams';
import type { DrawPlayer, DrawTeam } from './page';

type Props = {
  tournament: { id: string; name: string; year: number };
  availablePlayers: DrawPlayer[];
  teams: DrawTeam[];
};

type Assignment = { player: DrawPlayer; team: DrawTeam };

const POSITION_ORDER = ['ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL'];

function snakeDraft(players: DrawPlayer[], teams: DrawTeam[]): Assignment[] {
  const sorted = [...players].sort((a, b) => {
    if (a.score == null && b.score == null) return 0;
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return b.score - a.score;
  });

  const n = teams.length;
  return sorted.map((player, i) => {
    const round = Math.floor(i / n);
    const idx = round % 2 === 0 ? i % n : n - 1 - (i % n);
    return { player, team: teams[idx] };
  });
}

export function DrawClient({ tournament, availablePlayers, teams }: Props) {
  const [result, setResult] = useState<Assignment[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canDraw = availablePlayers.length >= 2 && teams.length >= 2;

  const handleDraw = () => {
    setSaved(false);
    setError(null);
    setResult(snakeDraft(availablePlayers, teams));
  };

  const handleSave = () => {
    if (!result) return;
    setError(null);
    const pairs = result.map(a => ({ playerId: a.player.id, teamId: a.team.id }));
    startTransition(async () => {
      const res = await saveDraw(pairs);
      if (!res.success) { setError(res.error); return; }
      setSaved(true);
    });
  };

  // Group result by team
  const byTeam = teams.map(team => ({
    team,
    players: (result ?? []).filter(a => a.team.id === team.id).map(a => a.player),
    totalScore: (result ?? [])
      .filter(a => a.team.id === team.id)
      .reduce((sum, a) => sum + (a.player.score ?? 0), 0),
  }));

  const globalAvg = result
    ? Math.round(result.reduce((s, a) => s + (a.player.score ?? 0), 0) / teams.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-5">
        <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">
          Sorteo balanceado · {tournament.name} {tournament.year}
        </div>
        <div className="font-serif font-bold text-xl text-slate-900">Distribución de jugadores</div>
        <div className="text-xs text-slate-500 mt-1">
          Snake draft por puntaje: los jugadores se distribuyen en zigzag para equilibrar los equipos.
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Jugadores disponibles" value={availablePlayers.length} />
        <StatCard label="Equipos" value={teams.length} />
        <StatCard
          label="Promedio por equipo"
          value={teams.length > 0 ? Math.ceil(availablePlayers.length / teams.length) : 0}
          suffix="jugadores"
        />
      </div>

      {/* Guards */}
      {teams.length < 2 && (
        <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-900">No hay suficientes equipos.</span>{' '}
            <a href="/admin/teams" className="underline text-amber-800">Creá al menos 2 equipos</a> antes de ejecutar el sorteo.
          </div>
        </div>
      )}

      {teams.length >= 2 && availablePlayers.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 text-sm">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-emerald-900">
            Todos los jugadores aprobados ya tienen equipo asignado. Podés gestionar los planteles desde{' '}
            <a href="/admin/teams" className="underline font-medium">Equipos</a>.
          </div>
        </div>
      )}

      {/* Players preview (before draw) */}
      {!result && availablePlayers.length > 0 && (
        <div className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                Jugadores sin equipo
              </span>
              <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5">
                {availablePlayers.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {[...availablePlayers]
              .sort((a, b) => {
                if (a.score == null && b.score == null) return 0;
                if (a.score == null) return 1;
                if (b.score == null) return -1;
                return b.score - a.score;
              })
              .map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-[10px] text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800">
                      {p.first_name} {p.last_name}
                      {p.nickname && <span className="text-slate-400 text-xs ml-1">"{p.nickname}"</span>}
                    </span>
                  </div>
                  {p.position && (
                    <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 uppercase">
                      {p.position}
                    </span>
                  )}
                  {p.score != null ? (
                    <span className="font-display text-base font-bold text-blue-900 w-8 text-right">{p.score}</span>
                  ) : (
                    <span className="text-slate-300 text-xs w-8 text-right">—</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Action button */}
      {canDraw && !saved && (
        <div className="flex justify-center">
          <button
            onClick={handleDraw}
            className="bg-blue-900 text-white px-8 py-3 font-medium text-sm hover:bg-blue-800 flex items-center gap-2 transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            {result ? 'Volver a sortear' : 'Ejecutar sorteo'}
          </button>
        </div>
      )}

      {/* Draw result */}
      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {byTeam.map(({ team, players, totalScore }) => {
              const diff = totalScore - globalAvg;
              return (
                <div key={team.id} className="bg-white border border-slate-200">
                  <div
                    className="px-4 py-3 flex items-center justify-between text-white"
                    style={{ backgroundColor: team.color }}
                  >
                    <div>
                      <div className="font-mono text-[9px] opacity-80 uppercase tracking-widest">{team.short_name}</div>
                      <div className="font-serif font-bold text-base leading-tight">{team.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold leading-none">{totalScore}</div>
                      <div className={`font-mono text-[9px] mt-0.5 ${diff === 0 ? 'opacity-60' : diff > 0 ? 'text-yellow-300' : 'text-blue-200'}`}>
                        {diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff}
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {players.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="font-mono text-[9px] text-slate-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-slate-800 truncate">
                            {p.first_name} {p.last_name}
                          </div>
                          {p.position && (
                            <div className="font-mono text-[9px] text-slate-400 uppercase">{p.position}</div>
                          )}
                        </div>
                        {p.score != null ? (
                          <span className="font-mono text-xs font-semibold text-blue-900 flex-shrink-0">{p.score}</span>
                        ) : (
                          <Star className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    {players.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-slate-400">Sin jugadores</div>
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                    <span className="font-mono text-[10px] text-slate-500">
                      {players.length} jugador{players.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {saved ? (
            <div className="bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-sm text-emerald-900">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-semibold">Sorteo guardado.</span>{' '}
                Los jugadores quedaron asignados a sus equipos. Podés ver los planteles en{' '}
                <a href="/admin/teams" className="underline font-medium">Equipos</a>.
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              <button
                onClick={handleDraw}
                disabled={isPending}
                className="border border-slate-200 bg-white text-slate-700 px-6 py-2.5 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" /> Volver a sortear
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="bg-emerald-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                {isPending ? 'Guardando...' : 'Confirmar asignación'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-white border border-slate-200 p-4 text-center">
      <div className="font-display text-3xl font-bold text-blue-900 leading-none">
        {value}
        {suffix && <span className="text-base font-sans text-slate-500 ml-1 font-normal">{suffix}</span>}
      </div>
      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}
