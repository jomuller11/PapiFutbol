import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MobileHeader } from '@/components/public/MobileHeader';
import { TeamColorSwatch } from '@/components/shared/TeamColorSwatch';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Sanciones â€” Liga.9',
  description: 'Ranking de jugadores sancionados del torneo.',
};

const CARD_POINTS: Record<string, number> = {
  yellow: 1,
  blue: 1,
  red: 3,
};

export default async function SanctionsPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Sanciones" backHref="/more" />
        <EmptyState />
      </div>
    );
  }

  const { data: cards } = await supabase
    .from('match_cards')
    .select(`
      type, player_id, team_id,
      player:players!match_cards_player_id_fkey(id, first_name, last_name, nickname),
      team:teams!match_cards_team_id_fkey(id, name, color, secondary_color),
      match:matches!match_cards_match_id_fkey(tournament_id)
    `)
    .eq('match.tournament_id', (tournament as any).id);

  const sanctions = new Map<string, {
    player_id: string;
    player_name: string;
    team_id: string | null;
    team_name: string;
    color: string;
    yellow: number;
    blue: number;
    red: number;
    points: number;
  }>();

  for (const card of (cards as any[]) ?? []) {
    if (!card.player_id || !card.player) continue;

    const existing = sanctions.get(card.player_id) ?? {
      player_id: card.player_id,
      player_name: card.player.nickname || `${card.player.first_name} ${card.player.last_name}`,
      team_id: card.team?.id ?? null,
      team_name: card.team?.name ?? 'Sin equipo',
      color: card.team?.color ?? '#94a3b8',
      yellow: 0,
      blue: 0,
      red: 0,
      points: 0,
    };

    existing[card.type as 'yellow' | 'blue' | 'red'] += 1;
    existing.points += CARD_POINTS[card.type] ?? 0;
    sanctions.set(card.player_id, existing);
  }

  const rows = Array.from(sanctions.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.red !== a.red) return b.red - a.red;
    if (b.blue !== a.blue) return b.blue - a.blue;
    if (b.yellow !== a.yellow) return b.yellow - a.yellow;
    return a.player_name.localeCompare(b.player_name);
  });

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Sanciones" backHref="/more" />
      <div className="md:max-w-4xl md:mx-auto">
        <div className="bg-gradient-to-br from-red-700 via-red-800 to-red-950 text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 noise opacity-20" />
          <div className="relative text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-red-200 mb-2 opacity-80" />
            <div className="font-serif text-2xl font-bold">SANCIONES</div>
            <div className="text-[10px] font-mono text-red-200 mt-1 uppercase tracking-widest">{(tournament as any).name}</div>
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <RuleCard color="bg-yellow-400" label="Amarilla" points="1 PTO" />
            <RuleCard color="bg-blue-500" label="Azul" points="1 PTO" />
            <RuleCard color="bg-red-500" label="Roja" points="3 PTOS" />
          </div>

          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-3 py-2 border-b border-slate-100 bg-slate-50 gap-3">
              <div className="w-5 text-[9px] font-mono text-slate-400 text-center">#</div>
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Jugador</div>
              <div className="w-6 text-center text-xs">🟨</div>
              <div className="w-6 text-center text-xs">🟦</div>
              <div className="w-6 text-center text-xs">🟥</div>
              <div className="w-10 text-center text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Ptos</div>
            </div>

            <div className="divide-y divide-slate-50">
              {rows.map((row, index) => (
                <Link
                  key={row.player_id}
                  href={`/player/${row.player_id}`}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center px-3 py-3 gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-5 text-center font-mono text-xs text-slate-400 font-bold">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">{row.player_name}</div>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      <TeamColorSwatch team={row} className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
                      <span className="text-[11px] text-slate-500 truncate">{row.team_name}</span>
                    </div>
                  </div>
                  <div className="w-6 text-center font-mono text-xs text-slate-500">{row.yellow || '—'}</div>
                  <div className="w-6 text-center font-mono text-xs text-slate-500">{row.blue || '—'}</div>
                  <div className="w-6 text-center font-mono text-xs text-slate-500">{row.red || '—'}</div>
                  <div className="w-10 text-center font-bold font-mono text-xs text-red-700">{row.points}</div>
                </Link>
              ))}

              {rows.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  TodavÃ­a no hay sanciones registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleCard({ color, label, points }: { color: string; label: string; points: string }) {
  return (
    <div className="bg-white border border-slate-200 p-2 text-center shadow-sm">
      <div className={`w-4 h-6 ${color} mx-auto rounded-sm mb-1.5 shadow-sm`} />
      <div className="text-[10px] font-semibold text-slate-800">{label}</div>
      <div className="text-[9px] text-slate-400 font-mono tracking-wider">{points}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Sanciones</h1>
      <p className="text-sm font-medium">Las sanciones aparecerÃ¡n con el torneo activo.</p>
    </div>
  );
}
