'use client';

import Link from 'next/link';
import { 
  Trophy, Users, CalendarDays, Activity, Target, Square, 
  Eye, ArrowRight, AlertTriangle 
} from 'lucide-react';

const MOCK_TEAMS = [
  { id: 1, name: 'Los Tigres', avg: 78.5, zone: 'A', pj: 3, pg: 2, pe: 1, pp: 0, gf: 7, gc: 3, pts: 7 },
  { id: 2, name: 'FC Boreal', avg: 85.0, zone: 'A', pj: 3, pg: 3, pe: 0, pp: 0, gf: 11, gc: 2, pts: 9 },
  { id: 5, name: 'Atlético Este', avg: 76.8, zone: 'A', pj: 3, pg: 1, pe: 0, pp: 2, gf: 5, gc: 8, pts: 3 },
];

const MOCK_MATCHES = [
  { id: 1, time: '10:00', field: 1, home: 'Los Tigres', away: 'Atlético Este', zone: 'A' },
  { id: 2, time: '10:00', field: 2, home: 'FC Boreal', away: 'Racing del Sur', zone: 'A' },
  { id: 3, time: '11:30', field: 1, home: 'Atlético Este', away: 'FC Boreal', zone: 'A' },
];

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden bg-neutral-900 border border-neutral-800 mb-6">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(34,197,94,0.03) 50%, transparent 50%), linear-gradient(rgba(34,197,94,0.08), rgba(34,197,94,0.08))',
          backgroundSize: '60px 100%, 100% 100%'
        }} />
        <div className="absolute top-0 left-0 w-full h-1" style={{
          background: 'repeating-linear-gradient(45deg, #fbbf24 0 12px, #171717 12px 24px)'
        }} />
        <div className="relative p-8 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] text-lime-400 tracking-widest mb-2 font-bold">EDICIÓN · 2026</div>
            <h2 className="font-display text-5xl mb-2 font-bold">Apertura 2026</h2>
            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Fase de Grupos · Fecha 3/5</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> 72 jugadores · 6 equipos</div>
              <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Próxima fecha: 25 Abr</div>
            </div>
          </div>
          <Link
            href="/admin/tournament"
            className="bg-lime-400 text-neutral-950 px-5 py-3 font-semibold text-sm hover:bg-lime-300 transition-colors flex items-center gap-2"
          >
            Gestionar <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Partidos jugados" value="18" sub="+4 esta fecha" color="lime" icon={Activity} />
        <StatCard label="Goles totales" value="63" sub="3.5 por partido" color="yellow" icon={Target} />
        <StatCard label="Tarjetas" value="42" sub="38 A · 2 R · 2 Az" color="orange" icon={Square} />
        <StatCard label="Veedores asignados" value="24/24" sub="100% cobertura" color="neutral" icon={Eye} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Próximos partidos */}
        <div className="col-span-2 bg-neutral-900 border border-neutral-800">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="font-display text-sm tracking-wide font-bold">PRÓXIMOS PARTIDOS</h3>
            <Link href="/admin/fixture" className="text-xs text-lime-400 hover:underline">Ver fixture completo →</Link>
          </div>
          <div className="divide-y divide-neutral-800">
            {MOCK_MATCHES.map(m => (
              <div key={m.id} className="px-5 py-3 hover:bg-neutral-800/50 flex items-center gap-4">
                <div className="font-mono text-[10px] text-neutral-500 w-20">
                  <div>{m.time}</div>
                  <div className="text-lime-400">CANCHA {m.field}</div>
                </div>
                <div className="flex-1 flex items-center justify-center gap-3 text-sm">
                  <span className="font-semibold text-right flex-1">{m.home}</span>
                  <span className="font-mono text-xs text-neutral-500">VS</span>
                  <span className="font-semibold flex-1">{m.away}</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 bg-neutral-800 px-2 py-1">
                  ZONA {m.zone}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Atención requerida */}
        <div className="bg-neutral-900 border border-neutral-800">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <h3 className="font-display text-sm tracking-wide font-bold">PENDIENTES</h3>
          </div>
          <div className="p-5 space-y-3">
            <PendingItem text="2 jugadores sin equipo asignado" action="Sortear" />
            <PendingItem text="Fecha 4 sin veedores confirmados" action="Asignar" />
            <PendingItem text="Partido del 18/04 sin resultado" action="Cargar" />
            <PendingItem text="Configurar Fase de Eliminatoria" action="Configurar" />
          </div>
        </div>
      </div>

      {/* Tabla de posiciones resumida */}
      <div className="mt-6 bg-neutral-900 border border-neutral-800">
        <div className="px-5 py-4 border-b border-neutral-800">
          <h3 className="font-display text-sm tracking-wide font-bold">TABLA DE POSICIONES · ZONA A</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] font-mono text-neutral-500 uppercase">
            <tr className="border-b border-neutral-800">
              <th className="text-left px-5 py-3">#</th>
              <th className="text-left py-3">Equipo</th>
              <th className="text-center py-3">PJ</th>
              <th className="text-center py-3">PG</th>
              <th className="text-center py-3">PE</th>
              <th className="text-center py-3">PP</th>
              <th className="text-center py-3">GF</th>
              <th className="text-center py-3">GC</th>
              <th className="text-center py-3">DIF</th>
              <th className="text-center py-3 px-5">PTS</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TEAMS.sort((a,b) => b.pts - a.pts).map((t, i) => (
              <tr key={t.id} className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50">
                <td className="px-5 py-3 font-mono text-neutral-500">{i + 1}</td>
                <td className="py-3 font-semibold">{t.name}</td>
                <td className="text-center font-mono">{t.pj}</td>
                <td className="text-center font-mono text-lime-400">{t.pg}</td>
                <td className="text-center font-mono">{t.pe}</td>
                <td className="text-center font-mono text-red-400">{t.pp}</td>
                <td className="text-center font-mono">{t.gf}</td>
                <td className="text-center font-mono">{t.gc}</td>
                <td className="text-center font-mono">{t.gf - t.gc > 0 ? '+' : ''}{t.gf - t.gc}</td>
                <td className="text-center font-display text-base px-5 font-bold">{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: any) {
  const colors: Record<string, string> = {
    lime: 'border-lime-400/30 bg-lime-400/5',
    yellow: 'border-yellow-400/30 bg-yellow-400/5',
    orange: 'border-orange-400/30 bg-orange-400/5',
    neutral: 'border-neutral-700 bg-neutral-900',
  };
  const textColors: Record<string, string> = {
    lime: 'text-lime-400', yellow: 'text-yellow-400', orange: 'text-orange-400', neutral: 'text-neutral-400'
  };
  return (
    <div className={`border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{label}</div>
        <Icon className={`w-4 h-4 ${textColors[color]}`} />
      </div>
      <div className="font-display text-4xl mb-1 font-bold">{value}</div>
      <div className="text-xs text-neutral-500">{sub}</div>
    </div>
  );
}

function PendingItem({ text, action }: any) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-neutral-300">
        <div className="w-1 h-1 bg-yellow-400 rounded-full flex-shrink-0" />
        <span className="text-xs">{text}</span>
      </div>
      <button className="text-[10px] font-mono text-lime-400 hover:underline uppercase tracking-wider font-bold">{action}</button>
    </div>
  );
}
