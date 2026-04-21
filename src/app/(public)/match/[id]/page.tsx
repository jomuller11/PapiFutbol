import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Clock, MapPin, Calendar, ChevronLeft, Zap } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('matches')
    .select(`
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name)
    `)
    .eq('id', id)
    .single();

  return {
    title: data
      ? `${(data.home_team as any)?.name} vs ${(data.away_team as any)?.name} — Liga.9`
      : 'Partido — Liga.9',
  };
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color),
      observer_team:teams!matches_observer_team_id_fkey(id, name)
    `)
    .eq('id', id)
    .single();

  if (!match) notFound();

  // Goles del partido
  const { data: goals } = await supabase
    .from('match_goals')
    .select(`
      id, minute, is_own_goal, team_id,
      player:players!match_goals_player_id_fkey(first_name, last_name, nickname)
    `)
    .eq('match_id', id)
    .order('minute', { ascending: true });

  // Tarjetas del partido
  const { data: cards } = await supabase
    .from('match_cards')
    .select(`
      id, minute, type, team_id,
      player:players!match_cards_player_id_fkey(first_name, last_name, nickname)
    `)
    .eq('match_id', id)
    .order('minute', { ascending: true });

  const isPlayed = match.status === 'played';
  const ht = match.home_team as any;
  const at = match.away_team as any;

  const homeGoals = (goals ?? []).filter(g => g.team_id === ht?.id);
  const awayGoals = (goals ?? []).filter(g => g.team_id === at?.id);

  const d = new Date(match.match_date + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Volver */}
      <Link href="/fixture" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
        <ChevronLeft className="w-4 h-4" />
        Volver al fixture
      </Link>

      {/* Cabecera del partido */}
      <div className="bg-blue-900 text-white p-6">
        {/* Meta */}
        <div className="flex items-center gap-4 text-blue-300 text-xs font-mono mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="capitalize">{dateLabel}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {match.match_time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Cancha {match.field_number}
          </span>
        </div>

        {/* Teams + Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Home */}
          <div className="flex-1 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: ht?.color ?? '#3b82f6' }}
            >
              {ht?.short_name ?? '?'}
            </div>
            <div className="font-serif font-bold text-base leading-tight">{ht?.name}</div>
          </div>

          {/* Score */}
          <div className="text-center flex-shrink-0">
            {isPlayed ? (
              <div className="font-serif text-4xl font-bold">
                {match.home_score}
                <span className="text-blue-400 mx-2">—</span>
                {match.away_score}
              </div>
            ) : (
              <div className="font-mono text-blue-300 text-sm bg-blue-800 px-4 py-2">
                {match.match_time}
              </div>
            )}
            <div className="mt-1">
              <StatusPill status={match.status} />
            </div>
          </div>

          {/* Away */}
          <div className="flex-1 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: at?.color ?? '#94a3b8' }}
            >
              {at?.short_name ?? '?'}
            </div>
            <div className="font-serif font-bold text-base leading-tight">{at?.name}</div>
          </div>
        </div>
      </div>

      {/* Goles */}
      {isPlayed && (goals ?? []).length > 0 && (
        <div className="bg-white border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-sm text-slate-900">Goles</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {(goals ?? []).map((g) => {
              const isHome = g.team_id === ht?.id;
              const pName = g.player
                ? (g.player as any).nickname || `${(g.player as any).first_name} ${(g.player as any).last_name}`
                : 'Desconocido';

              return (
                <div key={g.id} className={`flex items-center gap-3 px-4 py-2.5 ${isHome ? '' : 'flex-row-reverse'}`}>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isHome ? ht?.color : at?.color }}
                  />
                  <div className={`flex-1 ${isHome ? '' : 'text-right'}`}>
                    <span className="text-sm font-semibold text-slate-900">{pName}</span>
                    {g.is_own_goal && <span className="text-xs text-slate-400 ml-1">(en contra)</span>}
                  </div>
                  {g.minute && (
                    <div className="text-xs font-mono text-slate-400 flex-shrink-0">{g.minute}'</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tarjetas */}
      {isPlayed && (cards ?? []).length > 0 && (
        <div className="bg-white border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-sm text-slate-900">Tarjetas</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {(cards ?? []).map((c) => {
              const isHome = c.team_id === ht?.id;
              const pName = c.player
                ? (c.player as any).nickname || `${(c.player as any).first_name} ${(c.player as any).last_name}`
                : 'Desconocido';
              const cardEmoji = c.type === 'yellow' ? '🟨' : c.type === 'blue' ? '🟦' : '🟥';

              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${isHome ? '' : 'flex-row-reverse'}`}>
                  <span className="text-base">{cardEmoji}</span>
                  <div className={`flex-1 ${isHome ? '' : 'text-right'}`}>
                    <span className="text-sm font-semibold text-slate-900">{pName}</span>
                  </div>
                  {c.minute && (
                    <div className="text-xs font-mono text-slate-400 flex-shrink-0">{c.minute}'</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Veedor */}
      {(match.observer_team as any)?.name && (
        <div className="bg-slate-50 border border-slate-200 p-4 flex items-center gap-2 text-sm text-slate-600">
          <span className="text-slate-400">👁</span>
          <span>Veedor: <strong>{(match.observer_team as any).name}</strong></span>
        </div>
      )}

      {/* Notas */}
      {match.notes && (
        <div className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <strong>Notas:</strong> {match.notes}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled: { label: 'Programado', cls: 'bg-slate-700 text-slate-200' },
    played: { label: 'Finalizado', cls: 'bg-emerald-500 text-white' },
    cancelled: { label: 'Suspendido', cls: 'bg-red-600 text-white' },
    postponed: { label: 'Postergado', cls: 'bg-amber-500 text-white' },
  };
  const { label, cls } = map[status] ?? map.scheduled;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-sm ${cls}`}>
      {label}
    </span>
  );
}
