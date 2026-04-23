'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateBracket, deleteBracket } from '@/lib/actions/brackets';
import { roundName } from '@/lib/utils/bracket';
import type { BracketData, BracketMatch } from '@/lib/actions/brackets';

// ─── Types ────────────────────────────────────────────────────────────────────

type Team = { id: string; name: string; short_name: string; color: string };
type Phase = {
  id: string;
  name: string;
  order: number;
  status: string;
  bracket: BracketData | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  red: 'bg-red-500', blue: 'bg-blue-600', green: 'bg-green-600',
  yellow: 'bg-yellow-400', orange: 'bg-orange-500', purple: 'bg-purple-600',
  pink: 'bg-pink-500', teal: 'bg-teal-500', indigo: 'bg-indigo-600',
  gray: 'bg-gray-500', black: 'bg-gray-900', white: 'bg-white border border-slate-300',
};

function TeamChip({ team }: { team: { name: string; short_name: string; color: string } | null }) {
  if (!team) {
    return (
      <span className="flex items-center gap-1.5 text-slate-400 italic text-sm">
        <span className="w-3 h-3 rounded-full bg-slate-200 border border-dashed border-slate-300" />
        Por definir
      </span>
    );
  }
  const bg = TEAM_COLORS[team.color] ?? 'bg-slate-400';
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${bg}`} />
      {team.name}
    </span>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const isPlayed = match.status === 'played';
  const homeWon = isPlayed && match.home_score !== null && match.away_score !== null && match.home_score >= match.away_score;
  const awayWon = isPlayed && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;

  return (
    <div className={`border rounded-lg overflow-hidden ${isPlayed ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
      <div className="px-3 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 border-b border-slate-100">
        P{match.bracket_position} · {match.match_date} {match.match_time} · Cancha {match.field_number}
      </div>
      <div className="divide-y divide-slate-100">
        <div className={`flex items-center justify-between px-3 py-2 ${homeWon ? 'font-bold' : ''}`}>
          <TeamChip team={match.home_team} />
          {isPlayed && <span className={`text-sm tabular-nums ${homeWon ? 'text-green-700 font-bold' : 'text-slate-500'}`}>{match.home_score}</span>}
        </div>
        <div className={`flex items-center justify-between px-3 py-2 ${awayWon ? 'font-bold' : ''}`}>
          <TeamChip team={match.away_team} />
          {isPlayed && <span className={`text-sm tabular-nums ${awayWon ? 'text-green-700 font-bold' : 'text-slate-500'}`}>{match.away_score}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── GenerateForm ─────────────────────────────────────────────────────────────

function GenerateForm({ phase, teams, onDone }: { phase: Phase; teams: Team[]; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamsCount, setTeamsCount] = useState(8);

  const today = new Date().toISOString().split('T')[0];

  function toggleTeam(id: string) {
    setSelectedTeams(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedTeams.length !== teamsCount) {
      setError(`Seleccioná exactamente ${teamsCount} equipos.`);
      return;
    }
    setError('');
    const fd = new FormData(e.currentTarget);
    fd.set('team_ids', selectedTeams.join(','));
    fd.set('phase_id', phase.id);
    startTransition(async () => {
      const result = await generateBracket(fd);
      if (!result.success) {
        setError((result as any).error);
      } else {
        onDone();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del bracket</label>
          <input
            name="name"
            defaultValue="Fase Eliminatoria"
            required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha inicio</label>
          <input
            type="date"
            name="start_date"
            defaultValue={today}
            required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad de equipos</label>
        <div className="flex gap-2">
          {[4, 8, 16].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => { setTeamsCount(n); setSelectedTeams([]); }}
              className={`px-4 py-1.5 rounded text-sm font-medium border transition-colors ${
                teamsCount === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {n} equipos
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-600">
            Seleccioná los {teamsCount} equipos (en orden de seed)
          </label>
          <span className={`text-xs font-mono ${selectedTeams.length === teamsCount ? 'text-green-600' : 'text-slate-400'}`}>
            {selectedTeams.length}/{teamsCount}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto border border-slate-200 rounded p-2">
          {teams.map(team => {
            const sel = selectedTeams.includes(team.id);
            const seedNum = sel ? selectedTeams.indexOf(team.id) + 1 : null;
            const bg = TEAM_COLORS[team.color] ?? 'bg-slate-400';
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => toggleTeam(team.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded border text-sm text-left transition-colors ${
                  sel
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : selectedTeams.length >= teamsCount
                    ? 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
                disabled={!sel && selectedTeams.length >= teamsCount}
              >
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${bg}`} />
                <span className="flex-1 truncate">{team.name}</span>
                {seedNum && <span className="text-[10px] font-bold text-blue-600">#{seedNum}</span>}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">El orden de selección define el seed (primero = seed 1).</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
      >
        {isPending ? 'Generando...' : 'Generar bracket'}
      </button>
    </form>
  );
}

// ─── BracketView ──────────────────────────────────────────────────────────────

function BracketView({ bracket, onDelete }: { bracket: BracketData; onDelete: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const totalRounds = bracket.rounds.length;

  function handleDelete() {
    if (!confirm('¿Eliminar el bracket y todos sus partidos? Solo es posible si no hay partidos jugados.')) return;
    startTransition(async () => {
      const result = await deleteBracket(bracket.id);
      if (!result.success) setError((result as any).error);
      else onDelete();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{bracket.name}</h3>
          <p className="text-xs text-slate-500">{bracket.teams_count} equipos · {totalRounds} rondas</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1 rounded disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Eliminando...' : 'Eliminar bracket'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      <div className="overflow-x-auto">
        <div className="flex gap-6 min-w-max pb-2">
          {bracket.rounds.map((roundMatches, rIdx) => (
            <div key={rIdx} className="flex flex-col gap-3" style={{ width: 240 }}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center pb-1 border-b border-slate-200">
                {roundName(rIdx + 1, totalRounds)}
              </div>
              <div
                className="flex flex-col gap-3 justify-around"
                style={{ minHeight: bracket.rounds[0].length * 90 }}
              >
                {roundMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 italic">
        Los ganadores se asignan automáticamente a la siguiente ronda al cargar resultados en el Fixture.
      </p>
    </div>
  );
}

// ─── BracketAdmin (main) ──────────────────────────────────────────────────────

export function BracketAdmin({
  tournamentName,
  phases,
  teams,
}: {
  tournamentName: string;
  phases: (Phase & { bracket: BracketData | null })[];
  teams: Team[];
}) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();

  const refresh = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [router]);

  if (phases.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-slate-800">Bracket eliminatorio</h1>
        <div className="bg-amber-50 border border-amber-200 p-6 rounded text-sm text-amber-800">
          No hay fases de tipo <strong>eliminatorio</strong> configuradas para <strong>{tournamentName}</strong>.
          Creá una fase de tipo &quot;Eliminatorio&quot; desde{' '}
          <a href="/admin/tournament" className="underline font-medium">Configuración del torneo</a>.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Bracket eliminatorio</h1>
        <p className="text-sm text-slate-500 mt-0.5">{tournamentName}</p>
      </div>

      {phases.map(phase => (
        <div key={phase.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h2 className="font-semibold text-slate-700">{phase.name}</h2>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
              {phase.status}
            </span>
          </div>

          {phase.bracket ? (
            <BracketView bracket={phase.bracket} onDelete={refresh} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                No hay bracket generado para esta fase. Configurá los equipos y la fecha de inicio.
              </p>
              {teams.length < 4 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Necesitás al menos 4 equipos en el torneo para generar un bracket.
                </p>
              ) : (
                <GenerateForm phase={phase} teams={teams} onDone={refresh} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
