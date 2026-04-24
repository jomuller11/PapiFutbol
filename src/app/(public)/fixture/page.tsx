import { createClient } from '@/lib/supabase/server';
import { Calendar } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';
import { FixtureClient } from './FixtureClient';

export const metadata = {
  title: 'Fixture — Liga.9',
  description: 'Todos los partidos del torneo de fútbol 9.',
};

export default async function FixturePage() {
  const supabase = await createClient();

  // Torneo activo
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, year')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Fixture" backHref="/" />
        <EmptyState message="No hay torneo activo. El fixture aparecerá aquí cuando comience." />
      </div>
    );
  }

  const { data: phases } = await supabase
    .from('phases')
    .select('id, name, type, order')
    .eq('tournament_id', (tournament as any).id)
    .order('order', { ascending: true });

  // Partidos con equipos
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, match_date, match_time, field_number, round_number, group_id, bracket_id,
      status, home_score, away_score, notes,
      phase:phases!matches_phase_id_fkey(id, name, type),
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, color),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, color),
      group:groups!matches_group_id_fkey(name),
      bracket:brackets!matches_bracket_id_fkey(name)
    `)
    .eq('tournament_id', (tournament as any).id)
    .order('phase_id', { ascending: true })
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true });

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Fixture" backHref="/" />
        <EmptyState message="El fixture aún no fue publicado. Volvé pronto." />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Fixture" backHref="/" />
      <div className="hidden md:block bg-blue-900 px-8 py-8 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-20" />
        <div className="relative max-w-6xl mx-auto">
          <div className="font-mono text-[10px] text-blue-300 uppercase tracking-widest mb-1">{(tournament as any).name} · {(tournament as any).year}</div>
          <div className="font-display text-4xl text-white">Fixture</div>
        </div>
      </div>
      <div className="md:max-w-6xl md:mx-auto">
        <FixtureClient matches={matches as any[]} phases={((phases as any[]) ?? []).map((phase) => ({ id: phase.id, name: phase.name, type: phase.type }))} />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
