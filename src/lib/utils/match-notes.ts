export type PenaltyScore = {
  home: number;
  away: number;
};

export type ParsedMatchNotes = {
  leg: 1 | 2 | null;
  penalties: PenaltyScore | null;
  text: string | null;
};

function isPenaltyScore(value: unknown): value is PenaltyScore {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.home === 'number' &&
    Number.isInteger(candidate.home) &&
    candidate.home >= 0 &&
    typeof candidate.away === 'number' &&
    Number.isInteger(candidate.away) &&
    candidate.away >= 0
  );
}

export function parseMatchNotes(notes: string | null | undefined): ParsedMatchNotes {
  if (!notes) return { leg: null, penalties: null, text: null };

  if (notes === 'leg:1' || notes === 'leg:2') {
    return {
      leg: notes === 'leg:1' ? 1 : 2,
      penalties: null,
      text: null,
    };
  }

  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    return {
      leg: parsed.leg === 1 || parsed.leg === 2 ? parsed.leg : null,
      penalties: isPenaltyScore(parsed.penalties) ? parsed.penalties : null,
      text: typeof parsed.text === 'string' && parsed.text.trim() ? parsed.text.trim() : null,
    };
  } catch {
    return { leg: null, penalties: null, text: notes.trim() || null };
  }
}

export function serializeMatchNotes(parsed: ParsedMatchNotes): string | null {
  const normalized: ParsedMatchNotes = {
    leg: parsed.leg === 1 || parsed.leg === 2 ? parsed.leg : null,
    penalties: parsed.penalties ? { home: parsed.penalties.home, away: parsed.penalties.away } : null,
    text: parsed.text?.trim() || null,
  };

  if (!normalized.leg && !normalized.penalties && !normalized.text) return null;
  if (normalized.leg && !normalized.penalties && !normalized.text) return `leg:${normalized.leg}`;
  if (!normalized.leg && !normalized.penalties && normalized.text) return normalized.text;

  return JSON.stringify({
    ...(normalized.leg ? { leg: normalized.leg } : {}),
    ...(normalized.penalties ? { penalties: normalized.penalties } : {}),
    ...(normalized.text ? { text: normalized.text } : {}),
  });
}

export function updateMatchPenalties(
  notes: string | null | undefined,
  penalties: PenaltyScore | null
): string | null {
  return serializeMatchNotes({ ...parseMatchNotes(notes), penalties });
}

export function getLegLabel(notes: string | null | undefined) {
  const leg = parseMatchNotes(notes).leg;
  return leg === 1 ? 'Ida' : leg === 2 ? 'Vuelta' : null;
}

export function getPenaltyScore(notes: string | null | undefined) {
  return parseMatchNotes(notes).penalties;
}

export function getVisibleMatchNotes(notes: string | null | undefined) {
  return parseMatchNotes(notes).text;
}

export function getMatchWinnerSide(
  homeScore: number | null | undefined,
  awayScore: number | null | undefined,
  notes: string | null | undefined
) {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
    return null;
  }

  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';

  const penalties = getPenaltyScore(notes);
  if (!penalties) return null;
  if (penalties.home > penalties.away) return 'home';
  if (penalties.away > penalties.home) return 'away';
  return null;
}

export function formatDisplayScore(
  score: number | null | undefined,
  notes: string | null | undefined,
  side: 'home' | 'away'
) {
  if (score === null || score === undefined) return '—';
  const penalties = getPenaltyScore(notes);
  if (!penalties) return String(score);
  return `${score} (${side === 'home' ? penalties.home : penalties.away})`;
}
