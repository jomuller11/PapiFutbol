import { createClient } from '@/lib/supabase/server';
import { BarChart3 } from 'lucide-react';
import { MobileHeader } from '@/components/public/MobileHeader';

export const metadata = {
  title: 'Posiciones — Liga.9',
  description: 'Tabla de posiciones del torneo de fútbol 9.',
};

export default async function StandingsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('stats_standings')
    .select('zone, rank, team_name, pts, pj, pg, pe, pp, gf, gc, fp')
    .order('zone', { ascending: true })
    .order('rank', { ascending: true });

  const standings = (rows as any[]) ?? [];
  const zone1 = standings.filter((r) => r.zone === 'Zona 1');
  const zone2 = standings.filter((r) => r.zone === 'Zona 2');

  if (standings.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-8">
        <MobileHeader title="Posiciones" backHref="/" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-8">
      <MobileHeader title="Posiciones" backHref="/" />
      <div className="p-4 space-y-6 md:max-w-4xl md:mx-auto">
        {zone1.length > 0 && <ZoneTable title="Zona 1" rows={zone1} />}
        {zone2.length > 0 && <ZoneTable title="Zona 2" rows={zone2} />}
      </div>
    </div>
  );
}

function ZoneTable({ title, rows }: { title: string; rows: any[] }) {
  return (
    <section className="bg-white border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-blue-900 text-white font-display text-lg">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8">#</th>
              <th className="text-left py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider">Equipo</th>
              <th className="text-center py-2 pr-3 font-mono text-[9px] text-blue-700 uppercase tracking-wider w-10">PTS</th>
              <th className="text-center py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8">PJ</th>
              <th className="text-center py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8">PG</th>
              <th className="text-center py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8">PE</th>
              <th className="text-center py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8">PP</th>
              <th className="text-center py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8">GF</th>
              <th className="text-center py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8">GC</th>
              <th className="text-center py-2 font-mono text-[9px] text-slate-400 uppercase tracking-wider w-8 hidden sm:table-cell">FP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr key={`${row.zone}-${row.rank}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 font-mono text-xs text-slate-400">{row.rank}</td>
                <td className="py-3 font-semibold text-slate-800 pr-2 text-xs sm:text-sm">{row.team_name}</td>
                <td className="py-3 pr-3 text-center">
                  <span className="font-display text-lg text-blue-900 font-bold">{row.pts}</span>
                </td>
                <td className="py-3 text-center font-mono text-xs text-slate-500">{row.pj}</td>
                <td className="py-3 text-center font-mono text-xs text-emerald-600 font-semibold">{row.pg}</td>
                <td className="py-3 text-center font-mono text-xs text-slate-500">{row.pe}</td>
                <td className="py-3 text-center font-mono text-xs text-red-500 font-semibold">{row.pp}</td>
                <td className="py-3 text-center font-mono text-xs text-slate-500">{row.gf}</td>
                <td className="py-3 text-center font-mono text-xs text-slate-500">{row.gc}</td>
                <td className="py-3 text-center font-mono text-xs text-slate-500 hidden sm:table-cell">{row.fp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-500 px-6">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <h1 className="font-serif text-xl font-bold text-slate-900 mb-2">Posiciones</h1>
      <p className="text-sm font-medium">Las posiciones aparecerán una vez que se sincronicen los datos.</p>
    </div>
  );
}
