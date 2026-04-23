import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBracketData, getBracketPhases } from '@/lib/actions/brackets';
import { BracketAdmin } from '@/components/admin/bracket/BracketAdmin';

export default async function AdminBracketPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, fields_count, time_slots')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 p-8 text-center">
          <div className="font-semibold text-amber-900 text-lg mb-1">No hay torneo activo</div>
          <div className="text-sm text-amber-800">
            Creá un torneo desde{' '}
            <a href="/admin/tournament" className="underline font-medium">
              Configuración del torneo
            </a>{' '}
            para gestionar el bracket.
          </div>
        </div>
      </div>
    );
  }

  const tournamentId = (tournament as any).id;

  const phases = await getBracketPhases(tournamentId);

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, color')
    .eq('tournament_id', tournamentId)
    .order('name', { ascending: true });

  const bracketsData = await Promise.all(
    phases.map((p: any) => getBracketData(p.id))
  );

  const phasesWithBrackets = phases.map((p: any, i: number) => ({
    ...p,
    bracket: bracketsData[i],
  }));

  return (
    <BracketAdmin
      tournamentName={(tournament as any).name}
      phases={phasesWithBrackets}
      teams={(teams as any[]) ?? []}
    />
  );
}
