import { createClient } from '@/lib/supabase/server';
import { ApprovalsPageClient } from '@/components/admin/approvals/ApprovalsPageClient';
import type { PlayerPosition, PlayerReference } from '@/types/database';

export type RegistrationRow = {
  registration_id: string;
  player_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'waitlist';
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  first_name: string;
  last_name: string;
  nickname: string | null;
  dni: string;
  email: string;
  phone: string;
  position: PlayerPosition;
  reference: PlayerReference;
  score: number | null;
  avatar_url: string | null;
};

export type ApprovalsData = {
  tournamentId: string | null;
  tournamentName: string | null;
  pending: RegistrationRow[];
  approved: RegistrationRow[];
  rejected: RegistrationRow[];
  waitlist: RegistrationRow[];
};

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('status', 'active')
    .maybeSingle();

  if (!tournament) {
    return (
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 p-10 text-center">
        <div className="font-mono text-[10px] text-slate-500 tracking-widest mb-2">SIN TORNEO ACTIVO</div>
        <h2 className="font-serif font-bold text-xl mb-2">No hay un torneo activo</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Para gestionar inscripciones, primero creá y activá un torneo desde la sección{' '}
          <span className="font-semibold">Torneo</span>.
        </p>
      </div>
    );
  }

  const { data: regs, error } = await supabase
    .from('player_tournament_registrations')
    .select(`
      id,
      status,
      requested_at,
      reviewed_at,
      rejection_reason,
      player:players!inner(
        id,
        first_name,
        last_name,
        nickname,
        dni,
        phone,
        position,
        reference,
        score,
        avatar_url,
        profile:profiles!inner(email)
      )
    `)
    .eq('tournament_id', tournament.id)
    .order('requested_at', { ascending: false });

  if (error) {
    return (
      <div className="max-w-5xl mx-auto bg-red-50 border border-red-200 p-6 text-red-800">
        <p className="font-semibold">No pudimos cargar las inscripciones.</p>
        <p className="text-xs mt-1 font-mono">{error.message}</p>
      </div>
    );
  }

  const rows: RegistrationRow[] = (regs ?? []).map((r: any) => ({
    registration_id: r.id,
    player_id: r.player.id,
    status: r.status,
    requested_at: r.requested_at,
    reviewed_at: r.reviewed_at,
    rejection_reason: r.rejection_reason,
    first_name: r.player.first_name,
    last_name: r.player.last_name,
    nickname: r.player.nickname,
    dni: r.player.dni,
    email: r.player.profile?.email ?? '',
    phone: r.player.phone,
    position: r.player.position,
    reference: r.player.reference,
    score: r.player.score,
    avatar_url: r.player.avatar_url,
  }));

  const data: ApprovalsData = {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    pending: rows.filter(r => r.status === 'pending'),
    approved: rows.filter(r => r.status === 'approved'),
    rejected: rows.filter(r => r.status === 'rejected'),
    waitlist: rows.filter(r => r.status === 'waitlist'),
  };

  return <ApprovalsPageClient data={data} />;
}
