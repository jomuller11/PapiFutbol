'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent } from 'react';
import {
  Trophy, Users, CalendarDays, Clock, MapPin, Plus, Settings, Edit3,
  Trash2, Hash, AlertCircle, Play, CheckCircle2, Ban, Save, ImagePlus,
} from 'lucide-react';
import {
  createTournament,
  setTournamentStatus,
  updateTimeSlots,
  deletePhase,
  updateTournamentBrand,
  uploadTournamentLogo,
} from '@/lib/actions/tournament';
import { PhaseEditor, type Phase as PhaseBase } from './PhaseEditor';
import { GroupsManager, type Group } from './GroupsManager';

type Tournament = {
  id: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  year: number;
  status: 'draft' | 'active' | 'finished' | 'cancelled';
  fields_count: number;
  players_per_team: number;
  max_teams: number;
  time_slots: string[];
  start_date: string | null;
  end_date: string | null;
};

type PhaseWithGroups = PhaseBase & {
  groups: Group[];
};

type Props = {
  tournament: Tournament | null;
  phases: PhaseWithGroups[];
  approvedPlayersCount: number;
  role: 'admin' | 'staff';
};

export function TournamentShell({ tournament, phases, approvedPlayersCount, role }: Props) {
  if (!tournament) {
    return <CreateTournamentForm />;
  }

  return (
    <TournamentDetail
      tournament={tournament}
      phases={phases}
      approvedPlayersCount={approvedPlayersCount}
      role={role}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulario para crear torneo nuevo (cuando no hay ninguno)
// ─────────────────────────────────────────────────────────────────────────────

function CreateTournamentForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createTournament(formData);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 p-8">
        <div className="font-mono text-[10px] text-orange-600 tracking-widest font-semibold mb-2">
          NUEVO TORNEO
        </div>
        <h1 className="font-serif text-2xl font-bold mb-1">Creá tu primer torneo</h1>
        <p className="text-sm text-slate-500 mb-6">
          Configurá los datos básicos. Las fases, canchas y equipos se agregan después.
        </p>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" name="name" required error={fieldErrors.name?.[0]} placeholder="Apertura 2026" />
            <Field label="Año" name="year" type="number" required defaultValue={new Date().getFullYear()} error={fieldErrors.year?.[0]} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Canchas" name="fields_count" type="number" required defaultValue={4} error={fieldErrors.fields_count?.[0]} />
            <Field label="Jugadores/equipo" name="players_per_team" type="number" required defaultValue={12} error={fieldErrors.players_per_team?.[0]} />
            <Field label="Máx. equipos" name="max_teams" type="number" required defaultValue={24} error={fieldErrors.max_teams?.[0]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha inicio" name="start_date" type="date" error={fieldErrors.start_date?.[0]} />
            <Field label="Fecha fin" name="end_date" type="date" error={fieldErrors.end_date?.[0]} />
          </div>
          <Field
            label="Horarios (separados por coma)"
            name="time_slots"
            required
            defaultValue="10:00, 11:30, 13:00"
            error={fieldErrors.time_slots?.[0]}
            placeholder="10:00, 11:30, 13:00"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-900 text-white py-2.5 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isPending ? 'Creando...' : 'Crear torneo'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, name, type, required, defaultValue, placeholder, error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
        {label} {required && <span className="text-orange-600">*</span>}
      </label>
      <input
        type={type || 'text'}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`w-full border px-3 py-2 text-sm focus:outline-none ${
          error ? 'border-red-400' : 'border-slate-200 focus:border-blue-700'
        }`}
      />
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detalle del torneo existente (con fases, zonas, canchas, horarios)
// ─────────────────────────────────────────────────────────────────────────────

function TournamentDetail({
  tournament, phases, approvedPlayersCount, role,
}: {
  tournament: Tournament;
  phases: PhaseWithGroups[];
  approvedPlayersCount: number;
  role: 'admin' | 'staff';
}) {
  const [editingPhase, setEditingPhase] = useState<PhaseBase | null>(null);
  const [creatingPhase, setCreatingPhase] = useState(false);

  return (
    <div className="max-w-6xl mx-auto">
      <TournamentHeader tournament={tournament} approvedPlayersCount={approvedPlayersCount} role={role} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <BrandPanel tournament={tournament} />
        <FieldsPanel tournament={tournament} />
        <TimeSlotsPanel tournament={tournament} />
      </div>

      {/* Fases */}
      <div className="bg-white border border-slate-200 mt-6">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-serif text-sm font-bold tracking-wide">Fases del torneo</h3>
          {role === 'admin' && (
            <button
              onClick={() => setCreatingPhase(true)}
              className="bg-blue-900 text-white px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-blue-800"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva fase
            </button>
          )}
        </div>

        {phases.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Todavía no hay fases. Agregá la primera para empezar a armar el torneo.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {phases.map(phase => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                onEdit={() => setEditingPhase(phase)}
                canEdit={role === 'admin'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <PhaseEditor
        open={creatingPhase}
        onClose={() => setCreatingPhase(false)}
        tournamentId={tournament.id}
        suggestedOrder={phases.length + 1}
      />
      <PhaseEditor
        open={!!editingPhase}
        onClose={() => setEditingPhase(null)}
        tournamentId={tournament.id}
        phase={editingPhase}
      />
    </div>
  );
}

function TournamentHeader({
  tournament, approvedPlayersCount, role,
}: {
  tournament: Tournament;
  approvedPlayersCount: number;
  role: 'admin' | 'staff';
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const changeStatus = (status: 'active' | 'finished' | 'cancelled') => {
    setError(null);
    const formData = new FormData();
    formData.append('tournamentId', tournament.id);
    formData.append('status', status);
    startTransition(async () => {
      const result = await setTournamentStatus(formData);
      if (!result.success) setError(result.error);
    });
  };

  const statusColor = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    finished: 'bg-blue-50 text-blue-800 border-blue-200',
    cancelled: 'bg-red-50 text-red-800 border-red-200',
  }[tournament.status];

  return (
    <div className="bg-white border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="font-mono text-[10px] text-orange-600 tracking-widest font-semibold">
              EDICIÓN {tournament.year}
            </div>
            <span className={`font-mono text-[10px] px-2 py-0.5 border font-semibold uppercase ${statusColor}`}>
              {tournament.status}
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-blue-900">{tournament.name}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {approvedPlayersCount} aprobados</span>
            <span>·</span>
            <span>{tournament.max_teams} equipos máx.</span>
            <span>·</span>
            <span>{tournament.players_per_team} jugadores/equipo</span>
          </div>
        </div>

        {role === 'admin' && (
          <div className="flex gap-2">
            {tournament.status === 'draft' && (
              <button
                onClick={() => changeStatus('active')}
                disabled={isPending}
                className="bg-emerald-600 text-white px-4 py-2 text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> Activar torneo
              </button>
            )}
            {tournament.status === 'active' && (
              <button
                onClick={() => changeStatus('finished')}
                disabled={isPending}
                className="bg-blue-900 text-white px-4 py-2 text-xs font-medium hover:bg-blue-800 flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar
              </button>
            )}
            {(tournament.status === 'draft' || tournament.status === 'active') && (
              <button
                onClick={() => {
                  if (confirm('¿Cancelar torneo? Esta acción es reversible.')) {
                    changeStatus('cancelled');
                  }
                }}
                disabled={isPending}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}

function BrandPanel({ tournament }: { tournament: Tournament }) {
  const [brandName, setBrandName] = useState(tournament.brand_name ?? 'Papi Fútbol');
  const [logoUrl, setLogoUrl] = useState<string | null>(tournament.logo_url ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no puede superar 2MB.');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('tournamentId', tournament.id);
      formData.append('brand_name', brandName.trim());

      const brandResult = await updateTournamentBrand(formData);
      if (!brandResult.success) {
        setError(brandResult.error);
        return;
      }

      if (logoFile) {
        const logoForm = new FormData();
        logoForm.append('tournament_id', tournament.id);
        logoForm.append('file', logoFile);
        const logoResult = await uploadTournamentLogo(logoForm);
        if (!logoResult.success) {
          setError(logoResult.error);
          return;
        }
        setLogoUrl(logoResult.data?.url ?? null);
        setLogoFile(null);
        setLogoPreview(null);
      }

      setSuccess('Marca actualizada.');
    });
  };

  const displayLogo = logoPreview ?? logoUrl;

  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
        <ImagePlus className="w-4 h-4 text-blue-700" />
        <h3 className="font-serif text-sm font-bold tracking-wide">Marca pública</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
            {displayLogo ? (
              <img src={displayLogo} alt={brandName || 'Logo del torneo'} className="w-full h-full object-contain" />
            ) : (
              <Trophy className="w-8 h-8 text-slate-300" />
            )}
          </div>
          <div className="flex-1">
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
              Nombre de marca
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Papi Fútbol"
              disabled={isPending}
              className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
            Logo
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleLogoChange}
            disabled={isPending}
            className="block w-full text-xs text-slate-500 file:mr-3 file:border-0 file:bg-blue-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-blue-800"
          />
          <div className="mt-1 text-[10px] text-slate-500">
            JPG, PNG, WEBP o SVG. Máximo 2MB.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3">
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || brandName.trim().length < 2}
          className="w-full bg-blue-900 text-white py-2.5 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Guardando...' : 'Guardar marca'}
        </button>
      </div>
    </div>
  );
}

function FieldsPanel({ tournament }: { tournament: Tournament }) {
  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-blue-700" />
        <h3 className="font-serif text-sm font-bold tracking-wide">Canchas ({tournament.fields_count})</h3>
      </div>
      <div className="p-5 grid grid-cols-2 gap-2">
        {Array.from({ length: tournament.fields_count }, (_, i) => i + 1).map(n => (
          <div key={n} className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2.5">
            <div className="w-8 h-8 bg-blue-900 text-white font-serif font-bold flex items-center justify-center text-sm">
              {n}
            </div>
            <span className="text-xs font-medium">Cancha {n}</span>
          </div>
        ))}
      </div>
      <div className="px-5 pb-3 text-[10px] text-slate-500">
        Para cambiar la cantidad, editá el torneo.
      </div>
    </div>
  );
}

function TimeSlotsPanel({ tournament }: { tournament: Tournament }) {
  const [slots, setSlots] = useState<string[]>(tournament.time_slots);
  const [newSlot, setNewSlot] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (nextSlots: string[]) => {
    setError(null);
    startTransition(async () => {
      const result = await updateTimeSlots(tournament.id, nextSlots);
      if (!result.success) {
        setError(result.error);
        setSlots(tournament.time_slots); // revertir
      }
    });
  };

  const addSlot = () => {
    if (!newSlot.trim() || slots.includes(newSlot.trim())) return;
    const next = [...slots, newSlot.trim()].sort();
    setSlots(next);
    setNewSlot('');
    save(next);
  };

  const removeSlot = (s: string) => {
    const next = slots.filter(x => x !== s);
    setSlots(next);
    save(next);
  };

  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
        <Clock className="w-4 h-4 text-orange-500" />
        <h3 className="font-serif text-sm font-bold tracking-wide">Horarios ({slots.length})</h3>
      </div>
      <div className="p-5 space-y-2">
        {slots.map(s => (
          <div key={s} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="font-mono text-sm font-medium">{s}</span>
            </div>
            <button
              onClick={() => removeSlot(s)}
              disabled={isPending}
              className="text-slate-400 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1 pt-1">
          <input
            type="time"
            value={newSlot}
            onChange={e => setNewSlot(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSlot(); }}
            placeholder="hh:mm"
            disabled={isPending}
            className="flex-1 border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:border-blue-700"
          />
          <button
            onClick={addSlot}
            disabled={isPending || !newSlot.trim()}
            className="bg-blue-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-800 flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 mt-2">{error}</div>
        )}
      </div>
    </div>
  );
}

function PhaseCard({
  phase, onEdit, canEdit,
}: {
  phase: PhaseWithGroups;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deletePhase(phase.id);
      if (!result.success) {
        setError(result.error);
        setConfirmDelete(false);
      }
    });
  };

  const statusBadge = {
    pending: { class: 'bg-slate-100 text-slate-600 border-slate-200', label: 'PENDIENTE' },
    active: { class: 'bg-orange-100 text-orange-700 border-orange-200', label: 'ACTIVA' },
    finished: { class: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'FINALIZADA' },
  }[phase.status];

  return (
    <div>
      <div className="p-5 flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-900 text-white font-display text-base flex items-center justify-center flex-shrink-0">
          {phase.order}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-slate-500 tracking-widest">
              FASE {phase.order}
            </span>
            <span className={`font-mono text-[9px] px-1.5 py-0.5 border font-semibold uppercase ${statusBadge.class}`}>
              {statusBadge.label}
            </span>
            <span className="font-mono text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 font-semibold">
              {phase.type === 'groups' ? 'GRUPOS' : 'ELIMINATORIA'}
            </span>
          </div>
          <div className="font-serif font-bold text-base">{phase.name}</div>
          <div className="text-xs text-slate-500 mt-1">
            {phase.type === 'groups' ? (
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {phase.groups.length} {phase.groups.length === 1 ? 'zona' : 'zonas'}
              </span>
            ) : (
              <span>Llave eliminatoria</span>
            )}
          </div>
        </div>

        {canEdit && !confirmDelete && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              disabled={isPending}
              className="text-slate-500 hover:text-blue-700 p-2 disabled:opacity-50"
              title="Editar"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="text-slate-500 hover:text-red-600 p-2 disabled:opacity-50"
              title="Borrar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {confirmDelete && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2">
            <span className="text-xs text-red-800 font-medium">¿Borrar la fase?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
              className="text-xs px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              No
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs px-2 py-1 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Sí, borrar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs p-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Panel de zonas (sólo para fases de grupos) */}
      {phase.type === 'groups' && (
        <GroupsManager phaseId={phase.id} phaseName={phase.name} groups={phase.groups} />
      )}
    </div>
  );
}
