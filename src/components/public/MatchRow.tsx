import Link from 'next/link';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import { formatDisplayScore, getMatchWinnerSide } from '@/lib/utils/match-notes';

export function MatchRow({ match, showScore }: { match: any; showScore?: boolean }) {
  const ht = match.home_team;
  const at = match.away_team;
  const winnerSide = getMatchWinnerSide(match.home_score, match.away_score, match.notes);
  const homeWon = winnerSide === 'home';
  const awayWon = winnerSide === 'away';
  
  return (
    <Link href={`/match/${match.id}`} className="block w-full bg-white border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-widest mb-2 uppercase">
        <span>Fecha {match.round_number} {match.group_id ? `· ${match.group?.name}` : ''}</span>
        {match.match_date && (
          <span>{new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: ht?.color || '#94a3b8' }} />
            <span className={`text-sm truncate ${homeWon ? 'font-bold' : 'font-medium text-slate-600'}`}>{ht?.name}</span>
          </div>
          {showScore ? (
            <span className={`font-display text-xl ${homeWon ? 'text-blue-900' : 'text-slate-400'}`}>{formatDisplayScore(match.home_score, match.notes, 'home')}</span>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5">vs</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: at?.color || '#94a3b8' }} />
            <span className={`text-sm truncate ${awayWon ? 'font-bold' : 'font-medium text-slate-600'}`}>{at?.name}</span>
          </div>
          {showScore ? (
            <span className={`font-display text-xl ${awayWon ? 'text-blue-900' : 'text-slate-400'}`}>{formatDisplayScore(match.away_score, match.notes, 'away')}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
