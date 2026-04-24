import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Trophy, Medal, Award } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';
import { TeamColorSwatch } from '@/components/shared/TeamColorSwatch';
import { getBracketsData, getBracketPhases } from '@/lib/actions/brackets';
import { roundName } from '@/lib/utils/bracket';
import { formatDisplayScore, getLegLabel, getMatchWinnerSide } from '@/lib/utils/match-notes';
import type { BracketData, BracketMatch } from '@/lib/actions/brackets';
 
export const metadata = {
  title: 'Brackets — Liga.9',
  description: 'Cuadros eliminatorios del torneo de fútbol 9.',
};
 
// ─────────────────────────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────────────────────────
 
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
 
type CupVisual = {
  label: string;
  short: string;
  color: string;
  textColor: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  Icon: typeof Trophy;
};
 
const CUP_VISUALS: Record<string, CupVisual> = {
  oro: {
    label: 'Copa Oro',
    short: 'ORO',
    color: '#ca8a04',
    textColor: '#854d0e',
    iconBg: '#ca8a04',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    Icon: Trophy,
  },
  plata: {
    label: 'Copa Plata',
    short: 'PLATA',
    color: '#94a3b8',
    textColor: '#475569',
    iconBg: '#94a3b8',
    badgeBg: '#f1f5f9',
    badgeText: '#475569',
    Icon: Medal,
  },
  bronce: {
    label: 'Copa Bronce',
    short: 'BRONCE',
    color: '#b45309',
    textColor: '#78350f',
    iconBg: '#b45309',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    Icon: Award,
  },
};
 
function getCupVisual(name: string): CupVisual {
  const lower = name.toLowerCase();
  if (lower.includes('oro')) return CUP_VISUALS.oro;
  if (lower.includes('plata')) return CUP_VISUALS.plata;
  if (lower.includes('bronce')) return CUP_VISUALS.bronce;
  return CUP_VISUALS.oro;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Helpers (replicados del archivo original)
// ─────────────────────────────────────────────────────────────────────────────
 
function groupTies(roundMatches: BracketMatch[]): TieGroup[] {
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
        const decisiveWinner = getMatchWinnerSide(decisiveMatch.home_score, decisiveMatch.away_score, decisiveMatch.notes);
        if (decisiveWinner) {
          const decisiveWinnerTeamId = decisiveWinner === 'home' ? decisiveMatch.home_team_id : decisiveMatch.away_team_id;
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
 
function getCupChampion(bracket: BracketData) {
  const finalRound = bracket.rounds[bracket.rounds.length - 1];
  if (!finalRound || finalRound.length === 0) return null;
  const finalTies = groupTies(finalRound);
  if (finalTies.length === 0) return null;
  const summary = getTieSummary(finalTies[0]);
  if (!summary.allPlayed || !summary.winnerSide) return null;
  return summary.winnerSide === 'home' ? summary.homeTeam : summary.awayTeam;
}
 
function countMatches(bracket: BracketData) {
  const total = bracket.rounds.flat().length;
  const played = bracket.rounds.flat().filter(m => m.status === 'played').length;
  return { total, played };
}
 
function getRoundStats(round: BracketMatch[] | undefined) {
  if (!round) return { played: 0, total: 0 };
  const total = round.length;
  const played = round.filter(m => m.status === 'played').length;
  return { played, total };
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Componentes de UI
// ─────────────────────────────────────────────────────────────────────────────
 
function TieCard({ tie, isFinal = false }: { tie: TieGroup; isFinal?: boolean }) {
  const summary = getTieSummary(tie);
  const home = summary.homeTeam;
  const away = summary.awayTeam;
  const winner = summary.winnerSide;
 
  const firstMatch = tie.matches[0];
  const matchId = firstMatch?.id;
  const isPending = !winner;
 
  const homeScore = summary.homeTotal;
  const awayScore = summary.awayTotal;
 
  const matchDate = firstMatch?.match_date
    ? new Date(firstMatch.match_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).toUpperCase()
    : null;
 
  const cardClasses = isPending
    ? 'bg-white border border-dashed border-slate-300'
    : 'bg-white border border-slate-200';
 
  const Wrapper = matchId ? Link : 'div';
  const wrapperProps = matchId
    ? { href: `/match/${matchId}`, className: `${cardClasses} block hover:border-blue-700 transition-colors` }
    : { className: cardClasses };
 
  return (
    <Wrapper {...(wrapperProps as any)}>
      {/* Local */}
      <div
        className={`flex items-center px-3 py-2.5 ${
          winner === 'home' ? 'bg-emerald-50 border-b border-emerald-100' : 'border-b border-slate-100'
        }`}
      >
        <TeamColorSwatch team={home} className="w-2.5 h-2.5 mr-2 flex-shrink-0" fallback="#cbd5e1" />
        <span
          className={`flex-1 text-[13px] truncate ${
            winner === 'home'
              ? 'font-semibold text-emerald-900'
              : home
              ? 'text-slate-700'
              : 'text-slate-400 italic'
          }`}
        >
          {home?.name ?? 'Por definir'}
        </span>
        {homeScore !== null ? (
          <span
            className={`liga-serif text-[14px] tabular-nums ml-2 ${
              winner === 'home' ? 'font-bold text-emerald-700' : 'font-semibold text-slate-400'
            }`}
          >
            {homeScore}
          </span>
        ) : (
          <span className="liga-mono text-[10px] text-slate-300 ml-2">—</span>
        )}
      </div>
 
      {/* Visitante */}
      <div
        className={`flex items-center px-3 py-2.5 ${
          winner === 'away' ? 'bg-emerald-50' : ''
        }`}
      >
        <TeamColorSwatch team={away} className="w-2.5 h-2.5 mr-2 flex-shrink-0" fallback="#cbd5e1" />
        <span
          className={`flex-1 text-[13px] truncate ${
            winner === 'away'
              ? 'font-semibold text-emerald-900'
              : away
              ? 'text-slate-700'
              : 'text-slate-400 italic'
          }`}
        >
          {away?.name ?? 'Por definir'}
        </span>
        {awayScore !== null ? (
          <span
            className={`liga-serif text-[14px] tabular-nums ml-2 ${
              winner === 'away' ? 'font-bold text-emerald-700' : 'font-semibold text-slate-400'
            }`}
          >
            {awayScore}
          </span>
        ) : (
          <span className="liga-mono text-[10px] text-slate-300 ml-2">—</span>
        )}
      </div>
 
      {/* Footer del cruce */}
      {tie.matches.length > 1 ? (
        <div className="border-t border-slate-100 px-3 py-1.5 bg-slate-50 flex items-center gap-2 text-[10px] font-mono text-slate-500">
          {tie.matches.map((m, idx) => {
            const leg = getLegLabel(m.notes);
            const label = leg === 'Ida' ? 'I' : leg === 'Vuelta' ? 'V' : `P${idx + 1}`;
            const date = m.match_date
              ? new Date(m.match_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).toUpperCase()
              : '';
            return (
              <span key={m.id} className="font-medium">
                {label} · {date}
              </span>
            );
          })}
        </div>
      ) : isPending && matchDate ? (
        <div className="border-t border-slate-100 px-3 py-1.5 bg-amber-50">
          <span className="liga-mono text-[10px] text-amber-800 font-semibold tracking-wider">
            {matchDate}
            {firstMatch?.match_time ? ` · ${firstMatch.match_time}` : ''}
            {firstMatch?.field_number ? ` · CANCHA ${firstMatch.field_number}` : ''}
          </span>
        </div>
      ) : matchDate ? (
        <div className="border-t border-slate-100 px-3 py-1.5">
          <span className="liga-mono text-[10px] text-slate-500 font-medium tracking-wider">
            {matchDate}
          </span>
        </div>
      ) : null}
    </Wrapper>
  );
}
 
function ChampionHero({ bracket, visual }: { bracket: BracketData; visual: CupVisual }) {
  const champion = getCupChampion(bracket);
  const Icon = visual.Icon;
 
  return (
    <div
      className="relative overflow-hidden p-5 text-center text-white"
      style={{
        background: champion
          ? `linear-gradient(135deg, ${visual.color} 0%, ${visual.textColor} 100%)`
          : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #172554 100%)',
      }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-12 translate-x-12" />
      <div className="relative">
        <div className="liga-mono text-[10px] font-bold tracking-[0.2em] mb-3 opacity-80">
          {champion ? `CAMPEÓN · ${visual.short}` : `${visual.short} · POR DEFINIR`}
        </div>
        <div
          className="w-12 h-12 mx-auto mb-3 border-2 border-white/40 flex items-center justify-center"
        >
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
        {champion ? (
          <div className="liga-display text-2xl tracking-wide leading-tight">{champion.name}</div>
        ) : (
          <div className="liga-display text-xl opacity-60 tracking-wide">POR DEFINIR</div>
        )}
      </div>
    </div>
  );
}
 
function CupSection({ bracket }: { bracket: BracketData }) {
  const visual = getCupVisual(bracket.name);
  const totalRounds = bracket.rounds.length;
  const { played, total } = countMatches(bracket);
  const champion = getCupChampion(bracket);
  const Icon = visual.Icon;
 
  const status = champion
    ? { label: 'FINALIZADA', bg: '#dcfce7', text: '#166534' }
    : played === 0
    ? { label: 'PENDIENTE', bg: visual.badgeBg, text: visual.badgeText }
    : { label: `EN CURSO · ${played}/${total}`, bg: '#fef3c7', text: '#92400e' };
 
  return (
    <section className="bg-white border border-slate-200 mb-6 overflow-hidden">
      {/* Header de la copa */}
      <div className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 flex items-center justify-center text-white flex-shrink-0"
            style={{ background: visual.color }}
          >
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="liga-serif text-xl font-bold leading-tight truncate" style={{ color: visual.textColor }}>
              {visual.label}
            </h2>
            <div className="liga-mono text-[10px] text-slate-500 tracking-widest mt-0.5 uppercase">
              {bracket.teams_count} equipos · {totalRounds} {totalRounds === 1 ? 'ronda' : 'rondas'}
            </div>
          </div>
        </div>
        <span
          className="liga-mono text-[10px] px-2.5 py-1 font-bold tracking-widest uppercase flex-shrink-0"
          style={{ background: status.bg, color: status.text }}
        >
          {status.label}
        </span>
      </div>
 
      {/* Métricas por ronda */}
      <div className="px-4 md:px-6 py-3 border-b border-slate-200 grid grid-cols-3 gap-2 md:gap-3">
        {bracket.rounds.map((round, idx) => {
          const stats = getRoundStats(round);
          const label = roundName(idx + 1, totalRounds);
          const allDone = stats.played === stats.total && stats.total > 0;
          const inProgress = stats.played > 0 && stats.played < stats.total;
 
          return (
            <div key={idx} className="bg-slate-50 border border-slate-100 px-3 py-2">
              <div className="liga-mono text-[9px] text-slate-500 tracking-widest uppercase font-semibold truncate">
                {label.toUpperCase()}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`liga-serif font-bold text-lg ${
                    allDone ? 'text-emerald-600' : inProgress ? 'text-orange-600' : 'text-slate-400'
                  }`}
                >
                  {stats.played}
                </span>
                <span className="liga-mono text-[10px] text-slate-400">/ {stats.total}</span>
              </div>
            </div>
          );
        })}
      </div>
 
      {/* Hero del campeón */}
      <ChampionHero bracket={bracket} visual={visual} />
 
      {/* Bracket: 8 equipos = layout especial estilo torneo. Otros = fallback en columnas */}
      {bracket.teams_count === 8 && totalRounds === 3 ? (
        <DesktopEightTeamBracket bracket={bracket} />
      ) : (
        <FallbackBracket bracket={bracket} />
      )}
 
      {/* Versión mobile siempre fallback (más legible) */}
      {bracket.teams_count === 8 && totalRounds === 3 && (
        <div className="lg:hidden">
          <FallbackBracket bracket={bracket} />
        </div>
      )}
    </section>
  );
}
 
function DesktopEightTeamBracket({ bracket }: { bracket: BracketData }) {
  const quarterTies = groupTies(bracket.rounds[0] ?? []);
  const semiTies = groupTies(bracket.rounds[1] ?? []);
  const finalTies = groupTies(bracket.rounds[2] ?? []);
  const finalTie = finalTies[0];
 
  return (
    <div className="hidden lg:block relative px-6 py-6 overflow-x-auto">
      {/* Líneas conectoras SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1100 480"
        preserveAspectRatio="none"
        style={{ minWidth: '1100px' }}
      >
        {/* Cuartos izquierda → Semi 1 (línea horizontal + vertical + horizontal) */}
        <line x1="266" y1="68" x2="284" y2="68" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="284" y1="68" x2="284" y2="190" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="266" y1="312" x2="284" y2="312" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="284" y1="312" x2="284" y2="190" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="284" y1="190" x2="306" y2="190" stroke="#cbd5e1" strokeWidth="1" />
 
        {/* Semi 1 → Final */}
        <line x1="528" y1="190" x2="546" y2="190" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="546" y1="190" x2="546" y2="240" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="546" y1="240" x2="568" y2="240" stroke="#cbd5e1" strokeWidth="1" />
 
        {/* Cuartos derecha → Semi 2 */}
        <line x1="836" y1="68" x2="818" y2="68" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="818" y1="68" x2="818" y2="190" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="836" y1="312" x2="818" y2="312" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="818" y1="312" x2="818" y2="190" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="818" y1="190" x2="794" y2="190" stroke="#cbd5e1" strokeWidth="1" />
 
        {/* Semi 2 → Final */}
        <line x1="572" y1="190" x2="554" y2="190" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="554" y1="190" x2="554" y2="240" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="554" y1="240" x2="572" y2="240" stroke="#cbd5e1" strokeWidth="1" />
      </svg>
 
      <div
        className="relative grid items-center gap-x-6"
        style={{
          gridTemplateColumns: '240px 240px 224px 240px 240px',
          minWidth: '1100px',
        }}
      >
        {/* Cuartos izquierda */}
        <div className="space-y-6">
          <div className="text-center liga-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Cuartos
          </div>
          {quarterTies.slice(0, 2).map((tie) => (
            <TieCard key={`l-q-${tie.position}`} tie={tie} />
          ))}
        </div>
 
        {/* Semi 1 */}
        <div>
          <div className="text-center liga-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Semifinal 1
          </div>
          {semiTies[0] ? <TieCard tie={semiTies[0]} /> : null}
        </div>
 
        {/* Final */}
        <div>
          <div className="text-center liga-mono text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-2">
            Final
          </div>
          {finalTie ? <TieCard tie={finalTie} isFinal /> : null}
        </div>
 
        {/* Semi 2 */}
        <div>
          <div className="text-center liga-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Semifinal 2
          </div>
          {semiTies[1] ? <TieCard tie={semiTies[1]} /> : null}
        </div>
 
        {/* Cuartos derecha */}
        <div className="space-y-6">
          <div className="text-center liga-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Cuartos
          </div>
          {quarterTies.slice(2, 4).map((tie) => (
            <TieCard key={`r-q-${tie.position}`} tie={tie} />
          ))}
        </div>
      </div>
    </div>
  );
}
 
function FallbackBracket({ bracket }: { bracket: BracketData }) {
  const totalRounds = bracket.rounds.length;
  const firstRoundCount = groupTies(bracket.rounds[0] ?? []).length || 1;
 
  return (
    <div className="-mx-px overflow-x-auto px-4 py-4 lg:px-6">
      <div className="flex min-w-max items-start gap-4">
        {bracket.rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} style={{ width: 240 }}>
            <div className="text-center liga-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 pb-2 border-b border-slate-100">
              {roundName(roundIndex + 1, totalRounds)}
            </div>
            <div className="flex flex-col justify-around gap-3" style={{ minHeight: firstRoundCount * 120 }}>
              {groupTies(roundMatches).map((tie) => (
                <TieCard key={tie.position} tie={tie} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
 
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <Trophy className="mb-3 h-12 w-12 text-slate-300" strokeWidth={1.5} />
      <p className="liga-serif text-xl font-bold text-slate-700 mb-1">Sin bracket disponible</p>
      <p className="text-sm text-slate-500 max-w-xs">
        El cuadro eliminatorio se publicará cuando los cruces estén definidos.
      </p>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────────────────────────────────────
 
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
        <MobileHeader title="Brackets" backHref="/" />
        <EmptyState />
      </div>
    );
  }
 
  const phases = await getBracketPhases((tournament as any).id);
  const allBrackets = (await Promise.all(phases.map((phase: any) => getBracketsData(phase.id)))).flat();
 
  if (allBrackets.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader title="Brackets" backHref="/" />
        <EmptyState />
      </div>
    );
  }
 
  // Ordenar copas: Oro, Plata, Bronce
  const ordered = [...allBrackets].sort((a, b) => {
    const order = (n: string) => {
      const lower = n.toLowerCase();
      if (lower.includes('oro')) return 0;
      if (lower.includes('plata')) return 1;
      if (lower.includes('bronce')) return 2;
      return 3;
    };
    return order(a.name) - order(b.name);
  });
 
  const t = tournament as any;
 
  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <MobileHeader title="Brackets" backHref="/" />
 
      {/* Hero desktop */}
      <div className="hidden md:block bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white px-8 py-10 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-20" />
        <div className="relative max-w-6xl mx-auto">
          <div className="liga-mono text-[10px] text-orange-400 tracking-[0.2em] font-bold mb-2 uppercase">
            FASE ELIMINATORIA · {t.year}
          </div>
          <h1 className="liga-display text-5xl tracking-wide">Brackets</h1>
          <p className="text-blue-200 text-sm mt-2">
            {t.name} · {ordered.length} {ordered.length === 1 ? 'copa' : 'copas'} en juego
          </p>
        </div>
      </div>
 
      {/* Hero mobile */}
      <div className="md:hidden bg-gradient-to-br from-blue-900 to-blue-950 text-white px-4 py-5 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-20" />
        <div className="relative">
          <div className="liga-mono text-[9px] text-orange-400 tracking-widest font-bold uppercase">
            FASE ELIMINATORIA · {t.year}
          </div>
          <h1 className="liga-display text-3xl mt-1 tracking-wide">Brackets</h1>
        </div>
      </div>
 
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        {ordered.map((bracket) => (
          <CupSection key={bracket.id} bracket={bracket} />
        ))}
      </div>
 
      {/* Leyenda al pie */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-2">
        <div className="bg-white border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-50 border border-emerald-200 inline-block"></span>
            <span className="liga-mono text-[10px] text-slate-600 font-semibold tracking-wider">GANADOR</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-white border border-dashed border-slate-300 inline-block"></span>
            <span className="liga-mono text-[10px] text-slate-600 font-semibold tracking-wider">PENDIENTE</span>
          </span>
          <span className="liga-mono text-[10px] text-slate-600 font-semibold tracking-wider">
            I = IDA · V = VUELTA
          </span>
        </div>
      </div>
    </div>
  );
}
 
