import Link from 'next/link';
import { Shield, Info, Phone, ChevronRight, User, GitMerge, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Más opciones — Liga.9',
};

export default async function MorePage() {
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, year')
    .eq('status', 'active')
    .maybeSingle();

  return (
    <div className="bg-slate-50 min-h-screen pb-8 md:max-w-2xl md:mx-auto">
      <div className="bg-blue-900 text-white pt-10 pb-6 px-4 relative overflow-hidden">
        <div className="absolute inset-0 stadium-grid opacity-30" />
        <div className="relative">
          <div className="font-serif text-3xl font-bold mb-1">Liga.9</div>
          <div className="text-blue-300 text-sm">
            {tournament ? `${(tournament as any).name} · ${(tournament as any).year}` : 'Torneo Colegial'}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="font-mono text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1 px-1">Torneo</div>

        <Link href="/bracket" className="w-full bg-white border border-slate-200 p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <GitMerge className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">Bracket eliminatorio</div>
            <div className="text-xs text-slate-500 mt-0.5">Cuadro de eliminación directa</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </Link>

        <Link href="/goalkeepers" className="w-full bg-white border border-slate-200 p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">Valla menos vencida</div>
            <div className="text-xs text-slate-500 mt-0.5">Goles en contra por equipo</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </Link>

        <Link href="/fair-play" className="w-full bg-white border border-slate-200 p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">Fair Play</div>
            <div className="text-xs text-slate-500 mt-0.5">Tarjetas y tabla de conducta</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </Link>

        <Link href="/sanctions" className="w-full bg-white border border-slate-200 p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">Sanciones</div>
            <div className="text-xs text-slate-500 mt-0.5">Ranking de jugadores amonestados y expulsados</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </Link>

        <button className="w-full bg-white border border-slate-200 p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">Reglamento</div>
            <div className="text-xs text-slate-500 mt-0.5">Reglas oficiales del torneo</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </button>

        <button className="w-full bg-white border border-slate-200 p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">Contacto</div>
            <div className="text-xs text-slate-500 mt-0.5">Soporte y dudas</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </button>

        <div className="font-mono text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1 px-1 mt-6">Administración</div>

        <Link href="/login" className="w-full bg-white border border-slate-200 p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">Panel de Control</div>
            <div className="text-xs text-slate-500 mt-0.5">Acceso para delegados y veedores</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </Link>
      </div>
    </div>
  );
}
