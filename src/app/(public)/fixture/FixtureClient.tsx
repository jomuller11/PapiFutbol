'use client';

import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { MatchRow } from '@/components/public/MatchRow';
import { TeamColorSwatch } from '@/components/shared/TeamColorSwatch';

type MatchItem = {
  id: string;
  match_date: string;
  match_time: string;
  field_number: number;
  round_number: number;
  group_id: string | null;
  bracket_id?: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  notes?: string | null;
  phase: { id: string; name: string; type?: string | null } | null;
  group: { name: string } | null;
  bracket: { name: string } | null;
  home_team: any;
  away_team: any;
};

type PhaseItem = {
  id: string;
  name: string;
  type: string;
};

function optionLabel(match: MatchItem) {
  if (match.bracket?.name) return match.bracket.name;
  if (match.group?.name) return match.group.name;
  return 'General';
}

export function FixtureClient({ matches, phases }: { matches: MatchItem[]; phases: PhaseItem[] }) {
  const defaultPhaseId = phases[0]?.id ?? 'all';
  const [phaseId, setPhaseId] = useState(defaultPhaseId);

  const phaseMatches = useMemo(
    () => matches.filter((match) => match.phase?.id === phaseId),
    [matches, phaseId]
  );

  const options = useMemo(() => {
    return Array.from(new Set(phaseMatches.map(optionLabel))).sort((a, b) => a.localeCompare(b));
  }, [phaseMatches]);

  const defaultOption = options[0] ?? 'all';
  const [selectedOption, setSelectedOption] = useState(defaultOption);

  const effectiveOption = options.includes(selectedOption) ? selectedOption : defaultOption;

  const rounds = useMemo(() => {
    const base = phaseMatches.filter((match) => effectiveOption === 'all' || optionLabel(match) === effectiveOption);
    return Array.from(new Set(base.map((match) => match.round_number))).sort((a, b) => a - b);
  }, [phaseMatches, effectiveOption]);

  const defaultRound = rounds[0] ?? 1;
  const [round, setRound] = useState(defaultRound);
  const effectiveRound = rounds.includes(round) ? round : defaultRound;

  const filtered = useMemo(() => {
    return phaseMatches.filter((match) => {
      if (effectiveOption !== 'all' && optionLabel(match) !== effectiveOption) return false;
      return match.round_number === effectiveRound;
    });
  }, [phaseMatches, effectiveOption, effectiveRound]);

  const byTime: Record<string, MatchItem[]> = {};
  filtered.forEach((match) => {
    if (!byTime[match.match_time]) byTime[match.match_time] = [];
    byTime[match.match_time].push(match);
  });

  return (
    <div>
      <div className="bg-white border-b border-slate-200 p-3 space-y-2 sticky top-14 z-20 md:top-[96px]">
        <div className="flex gap-1 overflow-x-auto hide-scroll -mx-3 px-3 pb-1">
          {phases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => {
                setPhaseId(phase.id);
                setSelectedOption('all');
                setRound(1);
              }}
              className={`flex-shrink-0 px-3 h-8 font-display text-sm ${
                phaseId === phase.id ? 'bg-orange-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500'
              }`}
            >
              {phase.name}
            </button>
          ))}
        </div>

        {options.length > 0 && (
          <div className="flex gap-1 text-[10px] font-mono tracking-wider pt-1 border-t border-slate-100 overflow-x-auto hide-scroll">
            <button
              onClick={() => setSelectedOption('all')}
              className={`px-2 py-0.5 whitespace-nowrap ${effectiveOption === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              TODAS
            </button>
            {options.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedOption(option)}
                className={`px-2 py-0.5 whitespace-nowrap ${effectiveOption === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto hide-scroll -mx-3 px-3 pb-1">
          {rounds.map((value) => (
            <button
              key={value}
              onClick={() => setRound(value)}
              className={`flex-shrink-0 w-8 h-8 font-display text-sm ${
                effectiveRound === value ? 'bg-blue-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {Object.keys(byTime).length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            No hay partidos programados para estos filtros.
          </div>
        ) : (
          Object.entries(byTime)
            .sort()
            .map(([time, matchesInTime]) => (
              <div key={time}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-orange-500 text-white px-2 py-1 font-mono font-bold text-[11px] shadow-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {time.substring(0, 5)}
                  </div>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {matchesInTime.map((match) =>
                    match.status === 'played' ? (
                      <MatchRow key={match.id} match={match} showScore />
                    ) : (
                      <MatchUpcomingRow key={match.id} match={match} />
                    )
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function MatchUpcomingRow({ match }: { match: MatchItem }) {
  const home = match.home_team;
  const away = match.away_team;
  const label = match.bracket?.name ?? match.group?.name ?? null;

  return (
    <a href={`/match/${match.id}`} className="block w-full bg-white border border-slate-200 p-3 hover:bg-slate-50 transition-colors shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-center w-14 flex-shrink-0">
          <div className="font-display text-xl leading-none text-slate-800">{match.field_number}</div>
          <div className="font-mono text-[9px] text-slate-500 mt-1.5 tracking-widest uppercase">Cancha</div>
        </div>
        <div className="w-px h-10 bg-slate-100" />
        <div className="flex-1 space-y-2 py-1">
          <div className="flex items-center gap-2">
            <TeamColorSwatch team={home} className="w-3 h-3 rounded-sm flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-900 truncate">{home?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <TeamColorSwatch team={away} className="w-3 h-3 rounded-sm flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-900 truncate">{away?.name}</span>
          </div>
        </div>
        {label && (
          <div className="text-[9px] font-mono bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 font-bold uppercase whitespace-nowrap">
            {label.substring(0, 10)}
          </div>
        )}
      </div>
    </a>
  );
}
