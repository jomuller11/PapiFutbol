'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createManualBracketMatches, deleteBracket, resolveBracketTieWinner } from '@/lib/actions/brackets';
import { roundName } from '@/lib/utils/bracket';
import { formatDisplayScore, getLegLabel, getMatchWinnerSide } from '@/lib/utils/match-notes';
import type { BracketData, BracketMatch } from '@/lib/actions/brackets';

type Team = { id: string; name: string; short_name: string; color: string };
type Phase = {
  id: string;
  name: string;
  order: number;
  status: string;
  brackets: BracketData[];
  qualifiedByCup: Record<string, Team[]>;
};

const TEAM_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  purple: 'bg-purple-600',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-600',
  gray: 'bg-gray-500',
  black: 'bg-gray-900',
  white: 'bg-white border border-slate-300',
};

type TieGroup = {
  position: number;
  matches: BracketMatch[];
};

type TieSummary = {
  homeTeam: BracketMatch['home_team'] | BracketMatch['away_team'] | null;
  awayTeam: BracketMatch['home_team'] | BracketMatch['away_team'] | null;
  homeTotal: number | null;
  awayTotal: number | null;
  winnerSide: 'home' | 'away' | null;
  allPlayed: boolean;
};

type TieLegColumn = {
  key: string;
  label: string;
  meta: string | null;
  homeValue: string | null;
  awayValue: string | null;
};

function groupTies(roundMatches: BracketMatch[]) {
  const grouped = new Map<number, BracketMatch[]>();

  for (const match of roundMatches) {
    if (!grouped.has(match.bracket_position)) grouped.set(match.bracket_position, []);
    grouped.get(match.bracket_position)!.push(match);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([position, matches]) => ({
      position,
      matches: [...matches].sort((a, b) => {
        const aLeg = getLegLabel(a.notes) === 'Vuelta' ? 2 : 1;
        const bLeg = getLegLabel(b.notes) === 'Vuelta' ? 2 : 1;
        return aLeg - bLeg;
      }),
    }));
}

function getTieSummary(tie: TieGroup): TieSummary {
  const firstMatch = tie.matches[0];
  if (!firstMatch) {
    return { homeTeam: null, awayTeam: null, homeTotal: null, awayTotal: null, winnerSide: null, allPlayed: false };
  }

  const homeTeam = firstMatch.home_team;
  const awayTeam = firstMatch.away_team;
  const homeId = homeTeam?.id ?? firstMatch.home_team_id;
  const awayId = awayTeam?.id ?? firstMatch.away_team_id;
  let homeTotal = 0;
  let awayTotal = 0;
  let allPlayed = true;

  for (const match of tie.matches) {
    if (match.status !== 'played' || match.home_score === null || match.away_score === null) {
      allPlayed = false;
      continue;
    }

    if (match.home_team_id === homeId) {
      homeTotal += match.home_score;
      awayTotal += match.away_score;
    } else {
      homeTotal += match.away_score;
      awayTotal += match.home_score;
    }
  }

  let winnerSide: 'home' | 'away' | null = null;
  if (allPlayed) {
    if (homeTotal > awayTotal) winnerSide = 'home';
    else if (awayTotal > homeTotal) winnerSide = 'away';
    else {
      const decisiveMatch = [...tie.matches]
        .reverse()
        .find((match) => getMatchWinnerSide(match.home_score, match.away_score, match.notes));

      if (decisiveMatch) {
        const decisiveWinner = getMatchWinnerSide(
          decisiveMatch.home_score,
          decisiveMatch.away_score,
          decisiveMatch.notes
        );

        if (decisiveWinner) {
          const decisiveWinnerTeamId =
            decisiveWinner === 'home' ? decisiveMatch.home_team_id : decisiveMatch.away_team_id;
          winnerSide = decisiveWinnerTeamId === homeId ? 'home' : decisiveWinnerTeamId === awayId ? 'away' : null;
        }
      }
    }
  }

  return {
    homeTeam,
    awayTeam,
    homeTotal: allPlayed ? homeTotal : null,
    awayTotal: allPlayed ? awayTotal : null,
    winnerSide,
    allPlayed,
  };
}

function compactMatchMeta(match: BracketMatch) {
  const parts = [match.match_date, match.match_time, match.field_number ? `Cancha ${match.field_number}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildTieLegColumns(tie: TieGroup, summary: TieSummary): TieLegColumn[] {
  const firstMatch = tie.matches[0];
  const homeId = summary.homeTeam?.id ?? firstMatch?.home_team_id ?? null;
  const awayId = summary.awayTeam?.id ?? firstMatch?.away_team_id ?? null;

  return tie.matches.map((match, index) => {
    const played = match.status === 'played' && match.home_score !== null && match.away_score !== null;

    if (!played) {
      return {
        key: match.id,
        label: getLegLabel(match.notes) ?? `P${index + 1}`,
        meta: compactMatchMeta(match),
        homeValue: null,
        awayValue: null,
      };
    }

    const summaryHomeIsLocal = homeId !== null && match.home_team_id === homeId;
    const summaryAwayIsAway = awayId !== null && match.away_team_id === awayId;

    return {
      key: match.id,
      label: getLegLabel(match.notes) ?? `P${index + 1}`,
      meta: compactMatchMeta(match),
      homeValue: summaryHomeIsLocal
        ? formatDisplayScore(match.home_score, match.notes, 'home')
        : formatDisplayScore(match.away_score, match.notes, 'away'),
      awayValue: summaryAwayIsAway
        ? formatDisplayScore(match.away_score, match.notes, 'away')
        : formatDisplayScore(match.home_score, match.notes, 'home'),
    };
  });
}

function TeamLine({
  team,
  values,
  isWinner,
}: {
  team: { name: string; short_name: string; color: string } | null;
  values: Array<string | null>;
  isWinner: boolean;
}) {
  const columnTemplate = `minmax(0,1fr) repeat(${Math.max(values.length, 1)}, minmax(2rem, auto))`;

  if (!team) {
    return (
      <div className="grid items-center gap-x-2 px-3 py-2" style={{ gridTemplateColumns: columnTemplate }}>
        <span className="text-sm italic text-slate-400">Por definir</span>
        {Array.from({ length: Math.max(values.length, 1) }).map((_, index) => (
          <span key={`pending-${index}`} className="text-right text-sm text-slate-300">
            -
          </span>
        ))}
      </div>
    );
  }

  const bg = TEAM_COLORS[team.color] ?? 'bg-slate-400';

  return (
    <div
      className={`grid items-center gap-x-2 px-3 py-2 ${isWinner ? 'bg-green-50/80' : ''}`}
      style={{ gridTemplateColumns: columnTemplate }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`h-3 w-3 rounded-full flex-shrink-0 ${bg}`} />
        <span className={`truncate text-sm ${isWinner ? 'font-semibold text-green-800' : 'font-medium text-slate-800'}`}>
          {team.name}
        </span>
      </div>
      {values.map((value, index) => (
        <span
          key={`${team.short_name}-${index}`}
          className={`text-right text-sm tabular-nums ${isWinner ? 'font-bold text-green-700' : 'font-medium text-slate-500'}`}
        >
          {value ?? '-'}
        </span>
      ))}
    </div>
  );
}

function TotalLine({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-blue-700">
        Total
      </span>
      <span className="text-right text-sm font-medium tabular-nums text-slate-500">{value}</span>
    </div>
  );
}

function TieCard({ tie }: { tie: TieGroup }) {
  const summary = getTieSummary(tie);
  const legColumns = buildTieLegColumns(tie, summary);
  const headerTemplate = `minmax(0,1fr) repeat(${Math.max(legColumns.length, 1)}, minmax(2rem, auto))`;
  const aggregateLabel =
    summary.homeTotal !== null && summary.awayTotal !== null
      ? `${summary.homeTotal} - ${summary.awayTotal}`
      : 'Pendiente';

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2">
        <div className="grid items-center gap-x-2" style={{ gridTemplateColumns: headerTemplate }}>
          <span className="text-[10px] font-mono text-slate-400">P{tie.position}</span>
          {legColumns.map((column) => (
            <span
              key={column.key}
              className="rounded-full bg-blue-100 px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-blue-700"
              title={column.meta ?? undefined}
            >
              {column.label}
            </span>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        <TeamLine
          team={summary.homeTeam}
          values={legColumns.map((column) => column.homeValue)}
          isWinner={summary.winnerSide === 'home'}
        />
        <TeamLine
          team={summary.awayTeam}
          values={legColumns.map((column) => column.awayValue)}
          isWinner={summary.winnerSide === 'away'}
        />
      </div>

      <div className="border-t border-slate-100 bg-slate-50 py-2">
        <TotalLine value={aggregateLabel} />
        {legColumns.some((column) => column.meta) ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 px-3 text-[10px] text-slate-400">
            {legColumns.map((column) =>
              column.meta ? <span key={`${column.key}-meta`}>{column.label}: {column.meta}</span> : null
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getTieResolution(group: TieGroup, nextRoundMatches: BracketMatch[] | undefined) {
  const teams = new Map<string, { id: string; name: string; short_name: string; color: string }>();
  const aggregate = new Map<string, number>();

  for (const match of group.matches) {
    if (match.home_team) teams.set(match.home_team.id, match.home_team);
    if (match.away_team) teams.set(match.away_team.id, match.away_team);

    if (match.home_team_id && match.home_score !== null) {
      aggregate.set(match.home_team_id, (aggregate.get(match.home_team_id) ?? 0) + match.home_score);
    }
    if (match.away_team_id && match.away_score !== null) {
      aggregate.set(match.away_team_id, (aggregate.get(match.away_team_id) ?? 0) + match.away_score);
    }
  }

  const complete = group.matches.every(
    (match) => match.status === 'played' && match.home_score !== null && match.away_score !== null
  );

  const orderedAggregate = Array.from(aggregate.entries()).sort((a, b) => b[1] - a[1]);
  const aggregateTied =
    orderedAggregate.length >= 2 && orderedAggregate[0][1] === orderedAggregate[1][1];

  const nextPosition = Math.ceil(group.position / 2);
  const slot = group.position % 2 === 1 ? 'home' : 'away';
  const nextTieMatches = (nextRoundMatches ?? []).filter((match) => match.bracket_position === nextPosition);
  const alreadyResolved = nextTieMatches.some((match) =>
    slot === 'home' ? Boolean(match.home_team_id) : Boolean(match.away_team_id)
  );

  return {
    teams: Array.from(teams.values()),
    complete,
    aggregateTied,
    alreadyResolved,
  };
}

function TieResolutionPanel({
  bracket,
  roundNumber,
  group,
  nextRoundMatches,
  onDone,
}: {
  bracket: BracketData;
  roundNumber: number;
  group: TieGroup;
  nextRoundMatches: BracketMatch[] | undefined;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const resolution = getTieResolution(group, nextRoundMatches);

  if (!resolution.complete || !resolution.aggregateTied || resolution.alreadyResolved || resolution.teams.length !== 2) {
    return null;
  }

  const reasonLabel =
    roundNumber === 1
      ? 'Ventaja deportiva'
      : roundNumber === 2
      ? 'Penales'
      : 'Desempate manual';

  const handleResolve = (winnerId: string) => {
    setError('');
    const formData = new FormData();
    formData.append('bracket_id', bracket.id);
    formData.append('round_number', String(roundNumber));
    formData.append('bracket_position', String(group.position));
    formData.append('winner_team_id', winnerId);

    startTransition(async () => {
      const result = await resolveBracketTieWinner(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      onDone();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="text-xs font-semibold text-amber-900">
        Llave empatada en el global. Defini el ganador por {reasonLabel.toLowerCase()}.
      </div>
      <div className="flex flex-wrap gap-2">
        {resolution.teams.map((team) => (
          <button
            key={team.id}
            type="button"
            disabled={isPending}
            onClick={() => handleResolve(team.id)}
            className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : team.name}
          </button>
        ))}
      </div>
      {error && <div className="text-xs text-red-700">{error}</div>}
    </div>
  );
}

function ManualCupForm({
  bracket,
  eligibleTeams,
  onDone,
}: {
  bracket: BracketData;
  eligibleTeams: Team[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [twoLeggedQuarters, setTwoLeggedQuarters] = useState(false);
  const [twoLeggedSemis, setTwoLeggedSemis] = useState(false);
  const [pairings, setPairings] = useState<Array<{ homeId: string; awayId: string }>>([
    { homeId: '', awayId: '' },
    { homeId: '', awayId: '' },
    { homeId: '', awayId: '' },
    { homeId: '', awayId: '' },
  ]);

  const usedTeamIds = useMemo(
    () =>
      pairings
        .flatMap((pairing) => [pairing.homeId, pairing.awayId])
        .filter(Boolean),
    [pairings]
  );

  const duplicatedTeamIds = new Set(usedTeamIds.filter((teamId, index) => usedTeamIds.indexOf(teamId) !== index));

  const updatePairing = (index: number, side: 'homeId' | 'awayId', value: string) => {
    setPairings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [side]: value };
      return next;
    });
  };

  const handleSubmit = () => {
    const teamIds = pairings.flatMap((pairing) => [pairing.homeId, pairing.awayId]).filter(Boolean);

    if (pairings.some((pairing) => !pairing.homeId || !pairing.awayId)) {
      setError('Completa los 4 cruces de cuartos.');
      return;
    }

    if (pairings.some((pairing) => pairing.homeId === pairing.awayId)) {
      setError('Un cruce no puede tener el mismo equipo de los dos lados.');
      return;
    }

    if (new Set(teamIds).size !== 8) {
      setError('Cada equipo tiene que aparecer una sola vez en la copa.');
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('bracket_id', bracket.id);
    formData.append('start_date', startDate);
    formData.append('team_ids', teamIds.join(','));
    formData.append('two_legged_quarters', String(twoLeggedQuarters));
    formData.append('two_legged_semis', String(twoLeggedSemis));

    startTransition(async () => {
      const result = await createManualBracketMatches(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      onDone();
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">
        Carga manualmente los cuartos de final. La copa se crea con semifinales y final vacias para que los ganadores avancen automaticamente al cargar resultados.
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-700">Equipos elegibles</div>
        <div className="flex flex-wrap gap-2">
          {eligibleTeams.map((team) => (
            <span key={team.id} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${TEAM_COLORS[team.color] ?? 'bg-slate-400'}`} />
              {team.name}
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Fecha de cuartos</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={twoLeggedQuarters}
            onChange={(e) => setTwoLeggedQuarters(e.target.checked)}
            className="accent-blue-600"
          />
          Cuartos con ida y vuelta
        </label>
        <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={twoLeggedSemis}
            onChange={(e) => setTwoLeggedSemis(e.target.checked)}
            className="accent-blue-600"
          />
          Semifinales con ida y vuelta
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {pairings.map((pairing, index) => (
          <div key={index} className="space-y-2 rounded border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cuarto {index + 1}</div>
            <select
              value={pairing.homeId}
              onChange={(e) => updatePairing(index, 'homeId', e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Elegir local</option>
              {eligibleTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <select
              value={pairing.awayId}
              onChange={(e) => updatePairing(index, 'awayId', e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Elegir visitante</option>
              {eligibleTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {duplicatedTeamIds.size > 0 && (
        <p className="text-xs text-amber-700">Hay equipos repetidos en los cruces. Cada equipo debe aparecer una sola vez.</p>
      )}

      {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Guardando cruces...' : 'Guardar cruces'}
      </button>
    </div>
  );
}

function BracketView({ bracket, onDelete }: { bracket: BracketData; onDelete: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const totalRounds = bracket.rounds.length;

  function handleDelete() {
    if (!confirm('Eliminar la copa y todos sus partidos? Solo es posible si no hay partidos jugados.')) return;
    startTransition(async () => {
      const result = await deleteBracket(bracket.id);
      if (!result.success) setError(result.error);
      else onDelete();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{bracket.name}</h3>
          <p className="text-xs text-slate-500">{bracket.teams_count} equipos | {totalRounds} rondas</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded border border-red-200 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          {isPending ? 'Eliminando...' : 'Eliminar copa'}
        </button>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-6 pb-2">
          {bracket.rounds.map((roundMatches, roundIndex) => (
            <div key={roundIndex} className="flex flex-col gap-3" style={{ width: 240 }}>
              <div className="border-b border-slate-200 pb-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {roundName(roundIndex + 1, totalRounds)}
              </div>
              <div className="flex flex-col justify-around gap-3" style={{ minHeight: bracket.rounds[0].length * 90 }}>
                {groupTies(roundMatches).map((tie) => (
                  <div key={tie.position} className="space-y-2">
                    <TieCard tie={tie} />
                    <TieResolutionPanel
                      bracket={bracket}
                      roundNumber={roundIndex + 1}
                      group={tie}
                      nextRoundMatches={bracket.rounds[roundIndex + 1]}
                      onDone={onDelete}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs italic text-slate-400">
        Los ganadores se asignan automaticamente a la siguiente ronda al cargar resultados en el Fixture.
      </p>
    </div>
  );
}

export function BracketAdmin({
  tournamentName,
  phases,
  allTeams,
}: {
  tournamentName: string;
  phases: Phase[];
  allTeams: Team[];
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
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-xl font-bold text-slate-800">Copas eliminatorias</h1>
        <div className="rounded border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          No hay fases de tipo <strong>eliminatorio</strong> configuradas para <strong>{tournamentName}</strong>.
          Crea una fase de tipo "Eliminatoria" desde{' '}
          <a href="/admin/tournament" className="font-medium underline">Configuracion del torneo</a>.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Copas eliminatorias</h1>
        <p className="mt-0.5 text-sm text-slate-500">{tournamentName}</p>
      </div>

      {phases.map((phase) => (
        <div key={phase.id} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h2 className="font-semibold text-slate-700">{phase.name}</h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-400">{phase.status}</span>
          </div>

          {phase.brackets.length === 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Esta fase todavia no tiene copas creadas. Editala desde configuracion del torneo o crea una nueva fase eliminatoria.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {phase.brackets.map((bracket) => {
                const eligibleTeams = phase.qualifiedByCup[bracket.id] ?? allTeams;
                const hasMatches = bracket.rounds.some((round) => round.length > 0);

                return (
                  <div key={bracket.id} className="space-y-4 rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-800">{bracket.name}</div>
                        <div className="text-xs text-slate-500">
                          {eligibleTeams.length} equipo{eligibleTeams.length !== 1 ? 's' : ''} disponibles
                        </div>
                      </div>
                    </div>

                    {hasMatches ? (
                      <BracketView bracket={bracket} onDelete={refresh} />
                    ) : (
                      <ManualCupForm bracket={bracket} eligibleTeams={eligibleTeams} onDone={refresh} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
