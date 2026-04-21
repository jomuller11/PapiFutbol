'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, User, X, Target, Square, Star, Info } from 'lucide-react';
import type { PlayerWithStats } from '@/app/admin/players/page';
import { ScoreEditor } from './ScoreEditor';

const POSITIONS = ['ARQ', 'DFC', 'LAT', 'MCC', 'MCO', 'EXT', 'DEL'] as const;

const POSITION_NAMES: Record<string, string> = {
  ARQ: 'Arquero',
  DFC: 'Defensor Central',
  LAT: 'Lateral',
  MCC: 'Mediocampista Central',
  MCO: 'Mediocampista Ofensivo',
  EXT: 'Extremo',
  DEL: 'Delantero',
};

const REFERENCE_NAMES: Record<string, string> = {
  padre_alumno: 'Padre de Alumno',
  padre_ex_alumno: 'Padre de Ex Alumno',
  ex_alumno: 'Ex Alumno',
  docente_colegio: 'Docente del Colegio',
  invitado: 'Invitado',
  hermano_marista: 'Hermano Marista',
  esposo_educadora: 'Esposo de Educadora',
  abuelo_alumno: 'Abuelo de Alumno',
};

type Props = {
  players: PlayerWithStats[];
};

export function PlayersPageClient({ players }: Props) {
  const [selectedPos, setSelectedPos] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scoreEditorOpen, setScoreEditorOpen] = useState(false);

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (selectedPos !== 'all' && p.position !== selectedPos) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const full = `${p.first_name} ${p.last_name} ${p.nickname ?? ''} ${p.dni}`.toLowerCase();
      return full.includes(q);
    });
  }, [players, selectedPos, search]);

  const selected = players.find(p => p.id === selectedId) ?? null;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6">
      <div className="col-span-2">
        {/* Filtros + búsqueda */}
        <div className="bg-white border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, apodo o DNI..."
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </div>
            <button className="bg-blue-900 text-white px-4 py-2 text-sm font-medium flex items-center gap-1.5 hover:bg-blue-800 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            <FilterChip
              label="TODAS"
              active={selectedPos === 'all'}
              onClick={() => setSelectedPos('all')}
            />
            {POSITIONS.map(p => (
              <FilterChip
                key={p}
                label={p}
                active={selectedPos === p}
                onClick={() => setSelectedPos(p)}
              />
            ))}
          </div>
        </div>

        {/* Resultado / vacío */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center text-slate-500">
            <User className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
            <p className="font-medium text-sm">
              {players.length === 0 ? 'Todavía no hay jugadores cargados.' : 'Ningún jugador coincide con los filtros.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-mono text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3">Jugador</th>
                  <th className="text-center py-3">Pos</th>
                  <th className="text-left py-3">Referencia</th>
                  <th className="text-center py-3">Equipo</th>
                  <th className="text-center py-3 px-5">Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${
                      selectedId === p.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center text-[10px] font-semibold">
                          {(p.first_name[0] ?? '') + (p.last_name[0] ?? '')}
                        </div>
                        <div>
                          <div className="font-medium">
                            {p.first_name} {p.last_name}
                          </div>
                          {p.nickname && (
                            <div className="text-[10px] text-slate-500">"{p.nickname}"</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 font-semibold">
                        {p.position}
                      </span>
                    </td>
                    <td className="text-xs text-slate-600">
                      {REFERENCE_NAMES[p.reference] ?? p.reference}
                    </td>
                    <td className="text-center text-xs">
                      {p.team_name ? (
                        p.team_name
                      ) : (
                        <span className="text-orange-600 font-mono text-[10px] font-semibold">
                          SIN EQUIPO
                        </span>
                      )}
                    </td>
                    <td className="text-center px-5">
                      <ScoreBadge score={p.score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-xs text-slate-500 font-mono">
          {filtered.length} / {players.length} jugadores
        </div>
      </div>

      {/* Panel lateral */}
      <div className="col-span-1">
        {selected ? (
          <PlayerDetail
            player={selected}
            onClose={() => setSelectedId(null)}
            onEditScore={() => setScoreEditorOpen(true)}
          />
        ) : (
          <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 text-sm sticky top-24">
            <User className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
            <p className="font-medium">Seleccioná un jugador</p>
            <p className="text-xs mt-1 text-slate-400">para ver sus detalles y puntaje</p>
          </div>
        )}
      </div>

      {selected && (
        <ScoreEditor
          open={scoreEditorOpen}
          onClose={() => setScoreEditorOpen(false)}
          player={selected}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-[10px] font-mono tracking-wider font-semibold transition-colors ${
        active ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-block font-mono text-[10px] px-2 py-0.5 border border-slate-200 bg-slate-50 text-slate-400">
        —
      </span>
    );
  }
  const color =
    score >= 13
      ? 'text-orange-700 border-orange-300 bg-orange-50'
      : score >= 10
      ? 'text-blue-800 border-blue-300 bg-blue-50'
      : 'text-slate-600 border-slate-200 bg-slate-50';
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-serif font-bold text-sm px-2.5 py-0.5 border ${color}`}
    >
      {score}
      <span className="text-[9px] opacity-60 font-mono">/15</span>
    </span>
  );
}

function PlayerDetail({
  player,
  onClose,
  onEditScore,
}: {
  player: PlayerWithStats;
  onClose: () => void;
  onEditScore: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 sticky top-24">
      <div className="relative h-28 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/20 -translate-y-12 translate-x-12 rotate-45" />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute -bottom-10 left-6 w-20 h-20 bg-white border-4 border-white flex items-center justify-center font-serif font-bold text-2xl text-blue-900 shadow-sm">
          {(player.first_name[0] ?? '') + (player.last_name[0] ?? '')}
        </div>
      </div>
      <div className="pt-12 px-6 pb-6">
        <div className="font-serif font-bold text-xl mb-1">
          {player.first_name} {player.last_name}
        </div>
        {player.nickname && (
          <div className="text-xs text-slate-500 mb-1">"{player.nickname}"</div>
        )}
        <div className="flex items-center gap-2 mb-5">
          <span className="font-mono text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 font-semibold">
            {POSITION_NAMES[player.position]}
          </span>
          <span className="text-xs text-slate-500">
            · {REFERENCE_NAMES[player.reference]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 border border-slate-100 p-3">
            <div className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
              Puntaje
            </div>
            {player.score === null ? (
              <div className="font-serif font-bold text-base text-slate-400 mt-1">
                Sin asignar
              </div>
            ) : (
              <div className="font-serif font-bold text-2xl text-orange-600">
                {player.score}
                <span className="text-sm text-slate-400">/15</span>
              </div>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3">
            <div className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
              Equipo
            </div>
            <div className="text-sm font-medium mt-1">{player.team_name || '—'}</div>
          </div>
        </div>

        <div className="mb-5">
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-2">
            Estadísticas del torneo
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatMini icon={Target} value={player.goals} label="Goles" color="blue" />
            <StatMini icon={Square} value={player.yellow_cards} label="Amar" color="yellow" />
            <StatMini icon={Square} value={player.red_cards} label="Rojas" color="red" />
            <StatMini icon={Square} value={player.blue_cards} label="Azules" color="azure" />
          </div>
        </div>

        <div className="mb-5 pb-5 border-b border-slate-100">
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-2">
            Datos de contacto
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">DNI</span>
              <span className="font-mono">{player.dni}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-mono text-[10px] truncate ml-2">{player.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Teléfono</span>
              <span className="font-mono text-[10px]">{player.phone}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onEditScore}
            className="w-full bg-orange-500 text-white py-2 text-sm font-medium hover:bg-orange-600 flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" />
            {player.score === null ? 'Asignar puntaje' : 'Cambiar puntaje'}
          </button>
          <button className="w-full bg-white border border-slate-200 text-slate-700 py-2 text-sm hover:bg-slate-50">
            Editar perfil completo
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 text-[10px] text-slate-500">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>
            El puntaje (1-15) se usa para balancear los equipos en el sorteo. Solo admin/staff
            pueden modificarlo.
          </span>
        </div>
      </div>
    </div>
  );
}

function StatMini({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Target;
  value: number;
  label: string;
  color: 'blue' | 'yellow' | 'red' | 'azure';
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-700',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    azure: 'text-sky-600',
  };
  return (
    <div className="bg-slate-50 border border-slate-100 p-2 text-center">
      <Icon className={`w-3 h-3 mx-auto mb-1 ${colors[color]}`} />
      <div className="font-serif font-bold text-base">{value}</div>
      <div className="font-mono text-[9px] text-slate-500 uppercase">{label}</div>
    </div>
  );
}
