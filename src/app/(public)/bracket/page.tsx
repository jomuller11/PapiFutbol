import { createClient } from '@/lib/supabase/server';
import { GitMerge } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';
import { getBracketData, getBracketPhases } from '@/lib/actions/brackets';
import { roundName } from '@/lib/utils/bracket';
import type { BracketData, BracketMatch } from '@/lib/actions/brackets';

export const metadata = {
  title: 'Bracket — Liga.9',
  description: 'Cuadro eliminatorio del torneo de fútbol 9.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  red: 'bg-red-500', blue: 'bg-blue-600', green: 'bg-green-600',
  yellow: 'bg-yellow-400', orange: 'bg-orange-500', purple: 'bg-purple-600',
  pink: 'bg-pink-500', teal: 'bg-teal-500', indigo: 'bg-indigo-600',
  gray: 'bg-gray-500', black: 'bg-gray-900', white: 'bg-white border border-slate-300',
};

function TeamRow({
  team,
  score,
  isWinner,
}: {
  team: { name: string; color: string } | null;
  score: number | null;
  isWinner: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-300 bg-slate-100 flex-shrink-0" />
        <span className="text-xs text-slate-400 italic">Por definir</span>
      </div>
    );
  }
  const bg = TEAM_COLORS[team.color] ?? 'bg-slate-400';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${isWinner ? 'bg-green-50' : ''}`}>
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bg}`} />
      <span className={`text-xs flex-1 ${isWinner ? 'font-bold text-green-800' : 'text-slate-700'}`}>
        {team.name}
      </span>
      {score !== null && (
        <span className={`text-xs tabular-nums font-bold ${isWinner ? 'text-green-700' : 'text-slate-500'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const played = match.status === 'played';
  const homeWins = played && match.home_score !== null && match.away_score !== null && match.home_score >= match.away_score;
  const awayWins = played && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;

  return (
    <div className={`rounded-lg border overflow-hidden shadow-sm ${played ? 'border-green-200' : 'border-slate-200'}`}>
      <div className="divide-y divide-slate-100">
        <TeamRow team={match.home_team} score={played ? match.home_score : null} isWinner={homeWins} />
        <TeamRow team={match.away_team} score={played ? match.away_score : null} isWinner={awayWins} />
      </div>
      <div className="px-3 py-1 bg-slate-50 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 font-mono">
          {match.match_date} · {match.match_time} · C{match.field_number}
        </span>
      </div>
    </div>
  );
}

function BracketView({ bracket }: { bracket: BracketData }) {
  const totalRounds = bracket.rounds.length;
  const firstRoundCount = bracket.rounds[0]?.length ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GitMerge className="w-4 h-4 text-blue-600" />
        <h2 className="font-semibold text-slate-800 text-sm">{bracket.name}</h2>
        <span className="text-[11px] text-slate-400">{bracket.teams_count} equipos</span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-4 min-w-max pb-2 items-start">
          {bracket.rounds.map((roundMatches, rIdx) => (
            <div key={rIdx} style={{ width: 180 }}>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2 pb-1 border-b border-slate-200">
                {roundName(rIdx + 1, totalRounds)}
              </div>
              <div
                className="flex flex-col justify-around"
                style={{ minHeight: firstRoundCount * 90 }}
              >
                {roundMatches.map(match => (
                  <div key={match.id} className="py-1">
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <GitMerge className="w-10 h-10 text-slate-300 mb-3" />
      <p className="text-slate-500 font-medium">Sin bracket disponible</p>
      <p className="text-slate-400 text-sm mt-1">El cuadro eliminatorio se publicará cuando esté listo.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BracketPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <MobileHeader title="Bracket" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  const phases = await getBracketPhases((tournament as any).id);
  const brackets = (await Promise.all(phases.map((p: any) => getBracketData(p.id)))).filter(Boolean) as BracketData[];

  if (brackets.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <MobileHeader title="Bracket" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Bracket" backHref="/" />

      {/* Desktop header */}
      <div className="hidden md:block max-w-5xl mx-auto px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-slate-800">Bracket eliminatorio</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {(tournament as any).name} · {(tournament as any).year}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 space-y-8">
        {brackets.map(bracket => (
          <div key={bracket.id} className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
            <BracketView bracket={bracket} />
          </div>
        ))}
      </div>
    </div>
  );
}
