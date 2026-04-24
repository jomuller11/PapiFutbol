import { createClient } from '@/lib/supabase/server';
import { GitMerge } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';
import { getBracketsData, getBracketPhases } from '@/lib/actions/brackets';
import { roundName } from '@/lib/utils/bracket';
import { formatDisplayScore, getLegLabel, getMatchWinnerSide } from '@/lib/utils/match-notes';
import type { BracketData, BracketMatch } from '@/lib/actions/brackets';

export const metadata = {
  title: 'Bracket - Liga.9',
  description: 'Cuadro eliminatorio del torneo de futbol 9.',
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
  const parts = [match.match_date, match.match_time, match.field_number ? `C${match.field_number}` : null].filter(Boolean);
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
  compact = false,
}: {
  team: { name: string; color: string } | null;
  values: Array<string | null>;
  isWinner: boolean;
  compact?: boolean;
}) {
  const columnTemplate = `minmax(0,1fr) repeat(${Math.max(values.length, 1)}, minmax(${compact ? '1.75rem' : '2rem'}, auto))`;

  if (!team) {
    return (
      <div className="grid items-center gap-x-2 px-3 py-2" style={{ gridTemplateColumns: columnTemplate }}>
        <span className="text-xs italic text-slate-400">Por definir</span>
        {Array.from({ length: Math.max(values.length, 1) }).map((_, index) => (
          <span key={`pending-${index}`} className="text-right text-xs text-slate-300">
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
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${bg}`} />
        <span className={`truncate text-xs ${isWinner ? 'font-bold text-green-800' : 'text-slate-700'}`}>{team.name}</span>
      </div>

      {values.map((value, index) => (
        <span
          key={`${team.name}-${index}`}
          className={`text-right text-xs font-bold tabular-nums ${isWinner ? 'text-green-700' : 'text-slate-500'}`}
        >
          {value ?? '-'}
        </span>
      ))}
    </div>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-blue-700">
        {label}
      </span>
      <span className="text-right text-xs font-bold tabular-nums text-slate-500">{value}</span>
    </div>
  );
}

function TieCard({ tie, compact = false }: { tie: TieGroup; compact?: boolean }) {
  const summary = getTieSummary(tie);
  const legColumns = buildTieLegColumns(tie, summary);
  const headerTemplate = `minmax(0,1fr) repeat(${Math.max(legColumns.length, 1)}, minmax(${compact ? '1.75rem' : '2rem'}, auto))`;
  const aggregateLabel =
    summary.homeTotal !== null && summary.awayTotal !== null
      ? `${summary.homeTotal} - ${summary.awayTotal}`
      : 'Pendiente';

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2">
        <div className="grid items-center gap-x-2" style={{ gridTemplateColumns: headerTemplate }}>
          <span />
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
          compact={compact}
        />
        <TeamLine
          team={summary.awayTeam}
          values={legColumns.map((column) => column.awayValue)}
          isWinner={summary.winnerSide === 'away'}
          compact={compact}
        />
      </div>

      <div className="border-t border-slate-100 bg-slate-50 py-2">
        <TotalLine label="Total" value={aggregateLabel} />

        {!compact && legColumns.some((column) => column.meta) ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
            {legColumns.map((column) =>
              column.meta ? <span key={`${column.key}-meta`}>{column.label}: {column.meta}</span> : null
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DesktopEightTeamBracket({ bracket }: { bracket: BracketData }) {
  const quarterTies = groupTies(bracket.rounds[0] ?? []);
  const semiTies = groupTies(bracket.rounds[1] ?? []);
  const finalTie = groupTies(bracket.rounds[2] ?? [])[0];

  return (
    <div className="hidden overflow-x-auto lg:block">
      <div className="min-w-[1120px] py-4">
        <div className="grid grid-cols-[260px_220px_220px_220px_260px] items-center gap-6">
          <div className="space-y-6">
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cuartos</div>
            {quarterTies.slice(0, 2).map((tie) => (
              <TieCard key={`left-q-${tie.position}`} tie={tie} compact />
            ))}
          </div>

          <div className="space-y-24">
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Semifinal 1</div>
            {semiTies[0] ? <TieCard tie={semiTies[0]} compact /> : <div />}
          </div>

          <div className="space-y-6">
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Final</div>
            {finalTie ? <TieCard tie={finalTie} compact /> : <div />}
          </div>

          <div className="space-y-24">
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Semifinal 2</div>
            {semiTies[1] ? <TieCard tie={semiTies[1]} compact /> : <div />}
          </div>

          <div className="space-y-6">
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cuartos</div>
            {quarterTies.slice(2, 4).map((tie) => (
              <TieCard key={`right-q-${tie.position}`} tie={tie} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FallbackBracket({ bracket }: { bracket: BracketData }) {
  const totalRounds = bracket.rounds.length;
  const firstRoundCount = groupTies(bracket.rounds[0] ?? []).length || 1;

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max items-start gap-4 pb-2">
        {bracket.rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} style={{ width: 260 }}>
            <div className="mb-2 border-b border-slate-200 pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {roundName(roundIndex + 1, totalRounds)}
            </div>
            <div className="flex flex-col justify-around" style={{ minHeight: firstRoundCount * 170 }}>
              {groupTies(roundMatches).map((tie) => (
                <div key={tie.position} className="py-2">
                  <TieCard tie={tie} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketView({ bracket }: { bracket: BracketData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitMerge className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-800">{bracket.name}</h2>
        <span className="text-[11px] text-slate-400">{bracket.teams_count} equipos</span>
      </div>

      <div className="space-y-4">
        {bracket.teams_count === 8 && bracket.rounds.length === 3 ? <DesktopEightTeamBracket bracket={bracket} /> : null}

        <div className={bracket.teams_count === 8 && bracket.rounds.length === 3 ? 'lg:hidden' : ''}>
          <FallbackBracket bracket={bracket} />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <GitMerge className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-medium text-slate-500">Sin bracket disponible</p>
      <p className="mt-1 text-sm text-slate-400">El cuadro eliminatorio se publicara cuando este listo.</p>
    </div>
  );
}

export default async function BracketPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader title="Bracket" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  const phases = await getBracketPhases((tournament as any).id);
  const brackets = (await Promise.all(phases.map((phase: any) => getBracketsData(phase.id)))).flat();

  if (brackets.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader title="Bracket" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <MobileHeader title="Bracket" backHref="/" />

      <div className="mx-auto hidden max-w-6xl px-6 pb-2 pt-6 md:block">
        <h1 className="text-2xl font-bold text-slate-800">Bracket eliminatorio</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {(tournament as any).name} | {(tournament as any).year}
        </p>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-4 md:px-6">
        {brackets.map((bracket) => (
          <div key={bracket.id} className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
            <BracketView bracket={bracket} />
          </div>
        ))}
      </div>
    </div>
  );
}
