'use client';

import React, { useState, useTransition } from 'react';
import {
  Trophy, Plus, ChevronRight, Hash, Users, MapPin,
  Clock, AlertCircle, CheckCircle2, Zap, Settings,
  CalendarDays, Edit3, X, Loader2
} from 'lucide-react';
import {
  createTournament,
  setTournamentStatus,
  createPhase,
  updateTimeSlots,
} from '@/lib/actions/tournament';
import type { Database } from '@/types/database';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Phase = Database['public']['Tables']['phases']['Row'];

interface Props {
  tournament: Tournament | null;
  phases: Phase[];
  approvedPlayersCount: number;
  role: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Shell
// ─────────────────────────────────────────────────────────────────────────────

export function TournamentShell({ tournament, phases, approvedPlayersCount, role }: Props) {
  const isAdmin = role === 'admin';
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 p-3 flex items-center gap-2 text-sm text-blue-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Estás en modo <strong className="ml-1">solo lectura</strong>. Solo los administradores pueden modificar la configuración del torneo.
        </div>
      )}
      {tournament ? (
        <ActiveTournamentView
          tournament={tournament}
          phases={phases}
          approvedPlayersCount={approvedPlayersCount}
          isAdmin={isAdmin}
        />
      ) : (
        <NoTournamentView isAdmin={isAdmin} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state: no hay torneo
// ─────────────────────────────────────────────────────────────────────────────

function NoTournamentView({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {/* Banner informativo */}
      <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 mb-6">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <span className="font-semibold text-amber-900">No hay ningún torneo activo.</span>
          <span className="text-amber-800">
            {isAdmin
              ? ' Creá uno para habilitar las inscripciones y el fixture.'
              : ' Cuando el administrador cree uno, aparecerá acá.'}
          </span>
        </div>
      </div>

      {isAdmin && (
        open ? (
          <div className="bg-white border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-bold text-slate-900">Nuevo torneo</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CreateTournamentForm onCancel={() => setOpen(false)} />
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full py-12 border-2 border-dashed border-slate-300 hover:border-blue-700 text-slate-400 hover:text-blue-700 flex flex-col items-center gap-3 transition-colors"
          >
            <Trophy className="w-8 h-8" />
            <span className="font-semibold">Crear nuevo torneo</span>
            <span className="text-sm">Configurá el año, canchas y horarios</span>
          </button>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista con torneo existente
// ─────────────────────────────────────────────────────────────────────────────

function ActiveTournamentView({
  tournament,
  phases,
  approvedPlayersCount,
  isAdmin,
}: {
  tournament: Tournament;
  phases: Phase[];
  approvedPlayersCount: number;
  isAdmin: boolean;
}) {
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [editingSlots, setEditingSlots] = useState(false);

  const isDraft = tournament.status === 'draft';
  const isActive = tournament.status === 'active';
  const isFinished = tournament.status === 'finished' || tournament.status === 'cancelled';
  const canEdit = isAdmin && !isFinished;

  return (
    <>
      {/* Header del torneo */}
      <div className="bg-white border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={tournament.status} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-slate-900">{tournament.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Edición {tournament.year}</p>
          </div>

          {/* Acciones de estado — solo admin */}
          {canEdit && (
            <div className="flex gap-2 flex-shrink-0">
              {isDraft && (
                <StatusActionButton
                  tournamentId={tournament.id}
                  nextStatus="active"
                  label="Activar torneo"
                  icon={Zap}
                  variant="primary"
                />
              )}
              {isActive && (
                <StatusActionButton
                  tournamentId={tournament.id}
                  nextStatus="finished"
                  label="Cerrar torneo"
                  icon={CheckCircle2}
                  variant="secondary"
                />
              )}
            </div>
          )}
        </div>

        {/* Stats del header */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <StatChip
            label="Canchas"
            value={tournament.fields_count.toString()}
            icon={MapPin}
          />
          <StatChip
            label="Jugadores/equipo"
            value={tournament.players_per_team.toString()}
            icon={Users}
          />
          <StatChip
            label="Equipos máx."
            value={tournament.max_teams.toString()}
            icon={Trophy}
          />
          <StatChip
            label="Inscriptos aprobados"
            value={approvedPlayersCount.toString()}
            icon={CheckCircle2}
            highlight={approvedPlayersCount > 0}
          />
        </div>
      </div>

      {/* Horarios */}
      <div className="bg-white border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <h3 className="font-semibold text-sm text-slate-900">Horarios de juego</h3>
          </div>
          {canEdit && (
            <button
              onClick={() => setEditingSlots((v) => !v)}
              className="text-xs text-blue-700 hover:underline font-medium"
            >
              {editingSlots ? 'Cancelar' : 'Editar'}
            </button>
          )}
        </div>
        <div className="p-5">
          {editingSlots ? (
            <TimeSlotsEditor
              tournamentId={tournament.id}
              initial={tournament.time_slots}
              onDone={() => setEditingSlots(false)}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(tournament.time_slots as string[]).map((slot) => (
                <div
                  key={slot}
                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-mono font-semibold text-slate-700"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {slot}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fases */}
      <div className="bg-white border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-700" />
            <h3 className="font-semibold text-sm text-slate-900">Fases del torneo</h3>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowPhaseForm((v) => !v)}
              className="flex items-center gap-1.5 text-xs bg-blue-900 text-white px-3 py-1.5 font-semibold hover:bg-blue-800 transition-colors"
            >
              {showPhaseForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showPhaseForm ? 'Cancelar' : 'Nueva fase'}
            </button>
          )}
        </div>

        <div className="p-5">
          {phases.length === 0 && !showPhaseForm ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No hay fases configuradas. Agregá la primera para estructurar el torneo.
            </p>
          ) : (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-4">
              {phases.map((phase, i) => (
                <React.Fragment key={phase.id}>
                  <PhaseCard phase={phase} index={i} />
                  {i < phases.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {showPhaseForm && (
            <div className="border border-slate-200 p-4 bg-slate-50">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Agregar fase {phases.length + 1}
              </h4>
              <AddPhaseForm
                tournamentId={tournament.id}
                nextOrder={phases.length + 1}
                onDone={() => setShowPhaseForm(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Fechas (si existen) */}
      {(tournament.start_date || tournament.end_date) && (
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-blue-700" />
            <h3 className="font-semibold text-sm text-slate-900">Período del torneo</h3>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            {tournament.start_date && (
              <div>
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Inicio</span>
                <span className="font-semibold">{formatDate(tournament.start_date)}</span>
              </div>
            )}
            {tournament.end_date && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <div>
                  <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Fin</span>
                  <span className="font-semibold">{formatDate(tournament.end_date)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulario: crear torneo
// ─────────────────────────────────────────────────────────────────────────────

function CreateTournamentForm({ onCancel }: { onCancel: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTournament(fd);
      if (!result.success) {
        setError(result.error);
      }
      // Si success, el revalidatePath actualiza la página automáticamente
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Nombre del torneo *</label>
          <input
            name="name"
            defaultValue={`Apertura ${currentYear}`}
            required
            className="field-input"
            placeholder="Ej: Apertura 2026"
          />
        </div>
        <div>
          <label className="field-label">Año *</label>
          <input
            name="year"
            type="number"
            defaultValue={currentYear}
            required
            className="field-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="field-label">Nº de canchas *</label>
          <input name="fields_count" type="number" defaultValue={4} min={1} max={10} required className="field-input" />
        </div>
        <div>
          <label className="field-label">Jugadores por equipo *</label>
          <input name="players_per_team" type="number" defaultValue={12} min={5} max={15} required className="field-input" />
        </div>
        <div>
          <label className="field-label">Máx. equipos *</label>
          <input name="max_teams" type="number" defaultValue={8} min={2} max={24} required className="field-input" />
        </div>
      </div>

      <div>
        <label className="field-label">
          Horarios de partido <span className="text-slate-400 font-normal">(separados por coma)</span>
        </label>
        <input
          name="time_slots"
          defaultValue="10:00, 11:30, 13:00"
          required
          className="field-input font-mono"
          placeholder="10:00, 11:30, 13:00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Fecha de inicio <span className="text-slate-400 font-normal">(opcional)</span></label>
          <input name="start_date" type="date" className="field-input" />
        </div>
        <div>
          <label className="field-label">Fecha de fin <span className="text-slate-400 font-normal">(opcional)</span></label>
          <input name="end_date" type="date" className="field-input" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Crear torneo en borrador
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulario: nueva fase
// ─────────────────────────────────────────────────────────────────────────────

function AddPhaseForm({
  tournamentId,
  nextOrder,
  onDone,
}: {
  tournamentId: string;
  nextOrder: number;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'groups' | 'bracket'>('groups');

  const phaseNames: Record<number, string> = {
    1: 'Fase de Grupos',
    2: 'Cuartos de Final',
    3: 'Semifinal',
    4: 'Final',
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('tournamentId', tournamentId);
    fd.set('order', nextOrder.toString());
    startTransition(async () => {
      const result = await createPhase(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-red-700 text-xs bg-red-50 border border-red-200 p-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Nombre</label>
          <input
            name="name"
            defaultValue={phaseNames[nextOrder] ?? `Fase ${nextOrder}`}
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Tipo</label>
          <div className="flex gap-2">
            {(['groups', 'bracket'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 text-xs font-semibold border transition-colors ${
                  type === t
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-700'
                }`}
              >
                {t === 'groups' ? (
                  <><Hash className="w-3 h-3 inline mr-1" />Grupos</>
                ) : (
                  <><Trophy className="w-3 h-3 inline mr-1" />Bracket</>
                )}
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={type} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn-secondary text-xs">
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className="btn-primary text-xs">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
          Agregar fase
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor de horarios
// ─────────────────────────────────────────────────────────────────────────────

function TimeSlotsEditor({
  tournamentId,
  initial,
  onDone,
}: {
  tournamentId: string;
  initial: string[];
  onDone: () => void;
}) {
  const [slots, setSlots] = useState<string[]>(initial as string[]);
  const [newSlot, setNewSlot] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addSlot() {
    if (!newSlot || slots.includes(newSlot)) return;
    setSlots((prev) => [...prev, newSlot].sort());
    setNewSlot('');
  }

  function removeSlot(slot: string) {
    setSlots((prev) => prev.filter((s) => s !== slot));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateTimeSlots(tournamentId, slots);
      if (!result.success) {
        setError(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-red-700 text-xs bg-red-50 border border-red-200 p-2">{error}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <div
            key={slot}
            className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 text-sm font-mono"
          >
            {slot}
            <button
              type="button"
              onClick={() => removeSlot(slot)}
              className="text-slate-400 hover:text-red-600 ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="time"
          value={newSlot}
          onChange={(e) => setNewSlot(e.target.value)}
          className="field-input font-mono w-32"
        />
        <button type="button" onClick={addSlot} className="btn-secondary text-xs flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone} className="btn-secondary text-xs">Cancelar</button>
        <button type="button" onClick={handleSave} disabled={isPending} className="btn-primary text-xs">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
          Guardar horarios
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Botón de cambio de estado
// ─────────────────────────────────────────────────────────────────────────────

function StatusActionButton({
  tournamentId,
  nextStatus,
  label,
  icon: Icon,
  variant,
}: {
  tournamentId: string;
  nextStatus: string;
  label: string;
  icon: React.ElementType;
  variant: 'primary' | 'secondary';
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await setTournamentStatus(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
          variant === 'primary'
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
        }`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        {label}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes pequeños
// ─────────────────────────────────────────────────────────────────────────────

function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  const statusColors: Record<string, string> = {
    pending: 'border-slate-200 bg-white',
    active: 'border-blue-700 bg-blue-50',
    finished: 'border-emerald-300 bg-emerald-50',
  };

  return (
    <div className={`min-w-[180px] p-4 border ${statusColors[phase.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
          FASE {index + 1}
        </span>
        {phase.status === 'active' && (
          <span className="text-[9px] font-bold bg-blue-700 text-white px-1.5 py-0.5">ACTIVA</span>
        )}
        {phase.status === 'finished' && (
          <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5">✓</span>
        )}
      </div>
      <div className="font-semibold text-sm text-slate-900 mb-1">{phase.name}</div>
      <div className="flex items-center gap-1 text-xs text-slate-500">
        {phase.type === 'groups' ? (
          <><Hash className="w-3 h-3" /> Grupos</>
        ) : (
          <><Trophy className="w-3 h-3" /> Bracket</>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Borrador', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    active: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    finished: { label: 'Finalizado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    cancelled: { label: 'Cancelado', cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const { label, cls } = map[status] ?? map.draft;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 border uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function StatChip({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className={`font-serif text-2xl font-bold ${highlight ? 'text-orange-500' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mt-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
