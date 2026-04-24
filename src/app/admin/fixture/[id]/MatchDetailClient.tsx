'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Target, Square, Eye, Calendar,
  MapPin, Clock, Trash2, AlertCircle, RotateCcw, Check, Plus,
} from 'lucide-react';
import {
  saveMatchResult, reopenMatch, updateMatchDetails,
  addMatchGoal, removeMatchGoal, addMatchCard, removeMatchCard,
} from '@/lib/actions/matches';
import { formatDisplayScore, getMatchWinnerSide, getPenaltyScore } from '@/lib/utils/match-notes';
import type { MatchDetailData, RosterPlayer, GoalRow, CardRow } from './page';

export function MatchDetailClient({ match }: { match: MatchDetailData }) {
  const router = useRouter();
  const hasResult = match.home_score !== null && match.away_score !== null;
  const played = match.status === 'played' || hasResult;
  const winnerSide = played ? getMatchWinnerSide(match.home_score, match.away_score, match.notes) : null;
  const homeWon = winnerSide === 'home';
  const awayWon = winnerSide === 'away';
  const returnHref = match.return_to ?? '/admin/fixture';
  const returnLabel = match.return_to ? 'Volver al bracket' : 'Volver al fixture';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <Link
        href={returnHref}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-900 font-medium transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {returnLabel}
      </Link>

      {/* Match header */}
      <div className="bg-blue-900 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-20" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4 text-xs font-mono flex-wrap">
            <span className="bg-white/10 px-2 py-1">{match.phase_name ?? 'Fase de grupos'}</span>
            {match.group_name && (
              <span className="bg-white/10 px-2 py-1">Zona {match.group_name}</span>
            )}
            <span className="bg-white/10 px-2 py-1">Fecha {match.round_number}</span>
            <span className="flex items-center gap-1 bg-white/10 px-2 py-1">
              <MapPin className="w-3 h-3" /> Cancha {match.field_number}
            </span>
            <span className="flex items-center gap-1 bg-white/10 px-2 py-1">
              <Clock className="w-3 h-3" /> {match.match_time}
            </span>
            <span className="flex items-center gap-1 bg-white/10 px-2 py-1">
              <Calendar className="w-3 h-3" /> {formatDate(match.match_date)}
            </span>
            <span className={`ml-auto px-3 py-1 text-xs font-semibold font-mono uppercase tracking-wider ${
              played
                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-white/10 text-blue-200'
            }`}>
              {played ? '✓ Jugado' : 'Pendiente'}
            </span>
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="font-serif text-2xl font-bold">{match.home_team.name}</span>
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: match.home_team.color }} />
              </div>
              <div className="font-mono text-[10px] text-blue-300 tracking-widest uppercase">LOCAL</div>
            </div>
            <div className="text-center">
              {played ? (
                <div className="font-display text-5xl font-bold">
                  <span className={homeWon ? '' : 'opacity-60'}>{formatDisplayScore(match.home_score, match.notes, 'home')}</span>
                  <span className="opacity-40 mx-2">–</span>
                  <span className={awayWon ? '' : 'opacity-60'}>{formatDisplayScore(match.away_score, match.notes, 'away')}</span>
                </div>
              ) : (
                <div className="font-display text-4xl opacity-40">— —</div>
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: match.away_team.color }} />
                <span className="font-serif text-2xl font-bold">{match.away_team.name}</span>
              </div>
              <div className="font-mono text-[10px] text-blue-300 tracking-widest uppercase">VISITANTE</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Result + Goals + Cards */}
        <div className="col-span-2 space-y-4">
          <ResultSection match={match} played={played} />
          <GoalsSection match={match} />
          <CardsSection match={match} />
        </div>

        {/* Right: Observer + Match info */}
        <div className="space-y-4">
          <ObserverSection match={match} />
          <MatchInfoSection match={match} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultSection
// ─────────────────────────────────────────────────────────────────────────────

function ResultSection({ match, played }: { match: MatchDetailData; played: boolean }) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '');
  const initialPenalties = getPenaltyScore(match.notes);
  const [penaltyHome, setPenaltyHome] = useState(initialPenalties?.home?.toString() ?? '');
  const [penaltyAway, setPenaltyAway] = useState(initialPenalties?.away?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canLoadPenalties = homeScore !== '' && awayScore !== '' && homeScore === awayScore;

  useEffect(() => {
    if (!canLoadPenalties && (penaltyHome !== '' || penaltyAway !== '')) {
      setPenaltyHome('');
      setPenaltyAway('');
    }
  }, [canLoadPenalties, penaltyHome, penaltyAway]);

  const handleSave = () => {
    setError(null);
    const fd = new FormData();
    fd.append('match_id', match.id);
    fd.append('home_score', homeScore);
    fd.append('away_score', awayScore);
    if (canLoadPenalties && penaltyHome !== '') fd.append('penalty_home', penaltyHome);
    if (canLoadPenalties && penaltyAway !== '') fd.append('penalty_away', penaltyAway);
    startTransition(async () => {
      try {
        const result = await saveMatchResult(fd);
        if (!result.success) {
          setError(result.error);
          return;
        }
        if (match.return_to) router.push(match.return_to);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al guardar el resultado.');
      }
    });
  };

  const handleReopen = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await reopenMatch(match.id);
        if (!result.success) {
          setError(result.error);
          return;
        }
        if (match.return_to) router.push(match.return_to);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al reabrir el partido.');
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
          Resultado
        </div>
        {played && (
          <button
            type="button"
            onClick={handleReopen}
            disabled={isPending}
            className="text-xs text-amber-600 hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" /> Reabrir partido
          </button>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4 justify-center mb-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1.5 font-medium">{match.home_team.short_name}</div>
            <input
              type="number"
              min={0}
              max={99}
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              disabled={isPending}
              className="w-20 h-16 border-2 border-slate-200 text-center font-display text-3xl text-blue-900 focus:outline-none focus:border-blue-700 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <span className="font-display text-2xl text-slate-300 mt-5">—</span>
          <div className="text-left">
            <div className="text-xs text-slate-500 mb-1.5 font-medium">{match.away_team.short_name}</div>
            <input
              type="number"
              min={0}
              max={99}
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              disabled={isPending}
              className="w-20 h-16 border-2 border-slate-200 text-center font-display text-3xl text-blue-900 focus:outline-none focus:border-blue-700 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        </div>

        {(canLoadPenalties || penaltyHome !== '' || penaltyAway !== '') && (
          <div className="mb-4 border border-slate-200 bg-slate-50 p-4">
            <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-3">
              Penales
            </div>
            <div className="flex items-center gap-4 justify-center">
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1.5 font-medium">{match.home_team.short_name}</div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={penaltyHome}
                  onChange={e => setPenaltyHome(e.target.value)}
                  disabled={isPending || !canLoadPenalties}
                  className="w-20 h-12 border border-slate-200 text-center font-display text-2xl text-slate-800 focus:outline-none focus:border-blue-700 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <span className="font-display text-xl text-slate-300 mt-5">â€”</span>
              <div className="text-left">
                <div className="text-xs text-slate-500 mb-1.5 font-medium">{match.away_team.short_name}</div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={penaltyAway}
                  onChange={e => setPenaltyAway(e.target.value)}
                  disabled={isPending || !canLoadPenalties}
                  className="w-20 h-12 border border-slate-200 text-center font-display text-2xl text-slate-800 focus:outline-none focus:border-blue-700 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 text-center">
              CargÃ¡ la definiciÃ³n por penales sÃ³lo si el partido terminÃ³ empatado.
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 flex items-start gap-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || homeScore === '' || awayScore === ''}
          className="w-full bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          {isPending ? 'Guardando...' : played ? 'Actualizar resultado' : 'Marcar como jugado'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GoalsSection
// ─────────────────────────────────────────────────────────────────────────────

function GoalsSection({ match }: { match: MatchDetailData }) {
  const [showForm, setShowForm] = useState(false);
  const [teamSide, setTeamSide] = useState<'home' | 'away'>('home');
  const [playerId, setPlayerId] = useState('');
  const [minute, setMinute] = useState('');
  const [ownGoal, setOwnGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roster = teamSide === 'home' ? match.home_roster : match.away_roster;
  const team = teamSide === 'home' ? match.home_team : match.away_team;

  const handleAdd = () => {
    if (!playerId) return;
    setError(null);
    const fd = new FormData();
    fd.append('match_id', match.id);
    fd.append('player_id', playerId);
    fd.append('team_id', team.id);
    if (minute) fd.append('minute', minute);
    fd.append('is_own_goal', ownGoal.toString());
    startTransition(async () => {
      try {
        const result = await addMatchGoal(fd);
        if (!result.success) { setError(result.error); return; }
        setPlayerId('');
        setMinute('');
        setOwnGoal(false);
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al guardar el gol.');
      }
    });
  };

  const handleRemove = (goalId: string) => {
    setActiveId(goalId);
    startTransition(async () => {
      try {
        const result = await removeMatchGoal(goalId);
        if (!result.success) setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al borrar el gol.');
      }
      setActiveId(null);
    });
  };

  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-700" />
          <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
            Goles
          </span>
          <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5">
            {match.goals.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          disabled={isPending}
          className="text-xs text-blue-700 hover:underline font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Agregar gol
        </button>
      </div>

      {showForm && (
        <div className="border-b border-slate-100 p-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Equipo</label>
              <div className="flex gap-1">
                {(['home', 'away'] as const).map(side => (
                  <button
                    type="button"
                    key={side}
                    onClick={() => { setTeamSide(side); setPlayerId(''); }}
                    className={`flex-1 py-1.5 text-xs font-medium border transition-colors ${
                      teamSide === side
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {side === 'home' ? match.home_team.short_name : match.away_team.short_name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Minuto</label>
              <input
                type="number"
                min={1}
                max={120}
                value={minute}
                onChange={e => setMinute(e.target.value)}
                placeholder="—"
                className="w-full border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-700 bg-white"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Jugador</label>
            <select
              value={playerId}
              onChange={e => setPlayerId(e.target.value)}
              className="w-full border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-700"
            >
              <option value="">Seleccionar jugador...</option>
              {roster.map(p => (
                <option key={p.player_id} value={p.player_id}>
                  {p.jersey_number != null ? `#${p.jersey_number} · ` : ''}{p.first_name} {p.last_name}
                  {p.nickname ? ` "${p.nickname}"` : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={ownGoal} onChange={e => setOwnGoal(e.target.checked)} className="w-3.5 h-3.5 accent-blue-900" />
            <span className="text-xs text-slate-600">Gol en contra</span>
          </label>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 mb-3 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 bg-white hover:bg-slate-50">Cancelar</button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!playerId || isPending}
              className="px-3 py-1.5 text-xs bg-blue-900 text-white font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar gol'}
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {match.goals.length === 0 && (
          <div className="px-5 py-6 text-center text-xs text-slate-400">Sin goles registrados.</div>
        )}
        {match.goals.map(g => {
          const isHome = g.team?.id === match.home_team.id;
          const busy = activeId === g.id && isPending;
          return (
            <div key={g.id} className={`flex items-center gap-3 px-4 py-2.5 text-xs transition-opacity ${busy ? 'opacity-40' : ''}`}>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: g.team?.color ?? '#94a3b8' }}
              />
              <span className="font-medium text-slate-800 flex-1 truncate">
                {g.player?.first_name} {g.player?.last_name}
                {g.is_own_goal && <span className="text-red-500 ml-1">(en contra)</span>}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">{isHome ? match.home_team.short_name : match.away_team.short_name}</span>
              {g.minute && <span className="text-slate-400 font-mono text-[10px]">{g.minute}'</span>}
              <button
                type="button"
                onClick={() => handleRemove(g.id)}
                disabled={isPending}
                className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CardsSection
// ─────────────────────────────────────────────────────────────────────────────

const CARD_TYPES = [
  { value: 'yellow', label: 'Amarilla', color: '#f59e0b', bg: 'bg-yellow-400' },
  { value: 'blue', label: 'Azul (5 min)', color: '#3b82f6', bg: 'bg-blue-500' },
  { value: 'red', label: 'Roja', color: '#ef4444', bg: 'bg-red-500' },
] as const;

function CardsSection({ match }: { match: MatchDetailData }) {
  const [showForm, setShowForm] = useState(false);
  const [teamSide, setTeamSide] = useState<'home' | 'away'>('home');
  const [playerId, setPlayerId] = useState('');
  const [cardType, setCardType] = useState<'yellow' | 'blue' | 'red'>('yellow');
  const [minute, setMinute] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roster = teamSide === 'home' ? match.home_roster : match.away_roster;
  const team = teamSide === 'home' ? match.home_team : match.away_team;

  const handleAdd = () => {
    if (!playerId) return;
    setError(null);
    const fd = new FormData();
    fd.append('match_id', match.id);
    fd.append('player_id', playerId);
    fd.append('team_id', team.id);
    fd.append('type', cardType);
    if (minute) fd.append('minute', minute);
    startTransition(async () => {
      try {
        const result = await addMatchCard(fd);
        if (!result.success) { setError(result.error); return; }
        setPlayerId('');
        setMinute('');
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al guardar la tarjeta.');
      }
    });
  };

  const handleRemove = (cardId: string) => {
    setActiveId(cardId);
    startTransition(async () => {
      try {
        const result = await removeMatchCard(cardId);
        if (!result.success) setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al borrar la tarjeta.');
      }
      setActiveId(null);
    });
  };

  const cardsByType = {
    yellow: match.cards.filter(c => c.type === 'yellow'),
    blue: match.cards.filter(c => c.type === 'blue'),
    red: match.cards.filter(c => c.type === 'red'),
  };

  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Square className="w-4 h-4 text-blue-700" />
          <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
            Tarjetas
          </span>
          <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5">
            {match.cards.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          disabled={isPending}
          className="text-xs text-blue-700 hover:underline font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Agregar tarjeta
        </button>
      </div>

      {showForm && (
        <div className="border-b border-slate-100 p-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Equipo</label>
              <div className="flex gap-1">
                {(['home', 'away'] as const).map(side => (
                  <button
                    type="button"
                    key={side}
                    onClick={() => { setTeamSide(side); setPlayerId(''); }}
                    className={`flex-1 py-1.5 text-xs font-medium border transition-colors ${
                      teamSide === side
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {side === 'home' ? match.home_team.short_name : match.away_team.short_name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Tipo</label>
              <div className="flex gap-1">
                {CARD_TYPES.map(ct => (
                  <button
                    key={ct.value}
                    onClick={() => setCardType(ct.value)}
                    className={`flex-1 py-1.5 text-[10px] font-medium border transition-colors ${
                      cardType === ct.value
                        ? `${ct.bg} text-white border-transparent`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={ct.label}
                  >
                    {ct.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Jugador</label>
              <select
                value={playerId}
                onChange={e => setPlayerId(e.target.value)}
                className="w-full border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-700"
              >
                <option value="">Seleccionar...</option>
                {roster.map(p => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.jersey_number != null ? `#${p.jersey_number} · ` : ''}{p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Minuto</label>
              <input
                type="number"
                min={1}
                max={120}
                value={minute}
                onChange={e => setMinute(e.target.value)}
                placeholder="—"
                className="w-full border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-700 bg-white"
              />
            </div>
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 mb-3 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 bg-white hover:bg-slate-50">Cancelar</button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!playerId || isPending}
              className="px-3 py-1.5 text-xs bg-blue-900 text-white font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar tarjeta'}
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {match.cards.length === 0 && (
          <div className="px-5 py-6 text-center text-xs text-slate-400">Sin tarjetas registradas.</div>
        )}
        {match.cards.map(c => {
          const ct = CARD_TYPES.find(t => t.value === c.type)!;
          const busy = activeId === c.id && isPending;
          return (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 text-xs transition-opacity ${busy ? 'opacity-40' : ''}`}>
              <div className={`w-3.5 h-4.5 ${ct.bg} flex-shrink-0`} style={{ aspectRatio: '2/3', borderRadius: '1px' }} />
              <span className="font-medium text-slate-800 flex-1 truncate">
                {c.player?.first_name} {c.player?.last_name}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                {c.team?.id === match.home_team.id ? match.home_team.short_name : match.away_team.short_name}
              </span>
              {c.minute && <span className="text-slate-400 font-mono text-[10px]">{c.minute}'</span>}
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    disabled={isPending}
                    className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ObserverSection
// ─────────────────────────────────────────────────────────────────────────────

function ObserverSection({ match }: { match: MatchDetailData }) {
  const [observerId, setObserverId] = useState(match.observer_team?.id ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.append('match_id', match.id);
    fd.append('match_date', match.match_date);
    fd.append('match_time', match.match_time);
    fd.append('field_number', match.field_number.toString());
    if (observerId) fd.append('observer_team_id', observerId);
    startTransition(async () => {
      const result = await updateMatchDetails(fd);
      if (!result.success) { setError(result.error); return; }
      setSaved(true);
    });
  };

  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Eye className="w-4 h-4 text-blue-700" />
        <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
          Veedor
        </span>
      </div>
      <div className="p-4 space-y-3">
        <select
          value={observerId}
          onChange={e => { setObserverId(e.target.value); setSaved(false); }}
          disabled={isPending}
          className="w-full border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-700"
        >
          <option value="">Sin asignar</option>
          {match.all_teams
            .filter(t => t.id !== match.home_team.id && t.id !== match.away_team.id)
            .map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
        </select>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full bg-slate-100 border border-slate-200 text-slate-700 py-2 text-xs font-medium hover:bg-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saved ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Guardado</> : <><Save className="w-3.5 h-3.5" /> Guardar veedor</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchInfoSection
// ─────────────────────────────────────────────────────────────────────────────

function MatchInfoSection({ match }: { match: MatchDetailData }) {
  const [date, setDate] = useState(match.match_date);
  const [time, setTime] = useState(match.match_time);
  const [field, setField] = useState(match.field_number.toString());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.append('match_id', match.id);
    fd.append('match_date', date);
    fd.append('match_time', time);
    fd.append('field_number', field);
    if (match.observer_team) fd.append('observer_team_id', match.observer_team.id);
    startTransition(async () => {
      const result = await updateMatchDetails(fd);
      if (!result.success) { setError(result.error); return; }
      setSaved(true);
    });
  };

  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-700" />
        <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
          Datos del partido
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSaved(false); }}
            disabled={isPending}
            className="w-full border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-700"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Hora</label>
            <input
              type="time"
              value={time}
              onChange={e => { setTime(e.target.value); setSaved(false); }}
              disabled={isPending}
              className="w-full border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-700"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Cancha</label>
            <input
              type="number"
              min={1}
              max={10}
              value={field}
              onChange={e => { setField(e.target.value); setSaved(false); }}
              disabled={isPending}
              className="w-full border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full bg-slate-100 border border-slate-200 text-slate-700 py-2 text-xs font-medium hover:bg-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saved ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Guardado</> : <><Save className="w-3.5 h-3.5" /> Guardar datos</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
