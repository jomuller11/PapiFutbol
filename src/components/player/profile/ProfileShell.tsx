'use client';

import { useState, useTransition, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import {
  Trophy, ArrowLeft, User, Star, CreditCard, Cake, Phone,
  GraduationCap, Check, AlertCircle, Camera, Upload, X,
  Footprints, Save, CheckCircle2,
} from 'lucide-react';
import { completePlayerProfile, uploadAvatar, type ProfileInput } from '@/lib/actions/players';

// ─── Datos de dominio ────────────────────────────────────────────────────────

const REFERENCES = [
  { value: 'padre_alumno', label: 'Padre de Alumno' },
  { value: 'padre_ex_alumno', label: 'Padre de Ex Alumno' },
  { value: 'ex_alumno', label: 'Ex Alumno' },
  { value: 'docente_colegio', label: 'Docente del Colegio' },
  { value: 'invitado', label: 'Invitado' },
  { value: 'hermano_marista', label: 'Hermano Marista' },
  { value: 'esposo_educadora', label: 'Esposo de Educadora' },
  { value: 'abuelo_alumno', label: 'Abuelo de Alumno' },
];

const POSITIONS = [
  { key: 'ARQ', name: 'Arquero' },
  { key: 'DFC', name: 'Defensor' },
  { key: 'LAT', name: 'Lateral' },
  { key: 'MCC', name: 'Medio' },
  { key: 'MCO', name: 'Media punta' },
  { key: 'EXT', name: 'Extremo' },
  { key: 'DEL', name: 'Delantero' },
];

const FEET = [
  { value: 'derecho', label: 'Derecho' },
  { value: 'izquierdo', label: 'Izquierdo' },
  { value: 'ambidiestro', label: 'Ambidiestro' },
];

const REG_LABELS: Record<string, string> = {
  none: 'Sin inscripción',
  pending: 'Pendiente de aprobación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  waitlist: 'Lista de espera',
};

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
    dni: string;
    birth_date: string;
    phone: string;
    reference: string;
    position: string;
    foot: string;
    avatar_url: string | null;
    score: number | null;
  };
  userEmail: string;
  activeTournament: { id: string; name: string; year: number } | null;
  registrationStatus: string;
  teamName: string | null;
  teamColor: string | null;
};

// ─── Shell ───────────────────────────────────────────────────────────────────

export function ProfileShell({
  player, userEmail, activeTournament, registrationStatus, teamName, teamColor,
}: Props) {
  const [form, setForm] = useState({
    firstName: player.first_name,
    lastName: player.last_name,
    nickname: player.nickname ?? '',
    dni: player.dni,
    birthDate: player.birth_date,
    phone: player.phone,
    reference: player.reference,
    position: player.position,
    foot: player.foot,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(player.avatar_url);
  const [avatarPending, startAvatarTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<typeof form>) => {
    setForm(s => ({ ...s, ...patch }));
    setSaved(false);
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;

    const reader = new FileReader();
    reader.onload = e => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('file', file);
    startAvatarTransition(async () => {
      const res = await uploadAvatar(fd);
      if (!res.success) setAvatarPreview(player.avatar_url);
    });
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = () => {
    setSaveError(null);
    setFieldErrors({});
    setSaved(false);

    const input: ProfileInput = {
      firstName: form.firstName,
      lastName: form.lastName,
      nickname: form.nickname || null,
      dni: form.dni,
      birthDate: form.birthDate,
      phone: form.phone,
      reference: form.reference as ProfileInput['reference'],
      position: form.position as ProfileInput['position'],
      foot: form.foot as ProfileInput['foot'],
    };

    startSaveTransition(async () => {
      const res = await completePlayerProfile(input);
      if (!res.success) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setSaveError(res.error ?? 'No pudimos guardar los cambios.');
        return;
      }
      setSaved(true);
    });
  };

  const canSave = Boolean(
    form.firstName.trim() && form.lastName.trim() && form.dni.trim() &&
    form.birthDate && form.phone.trim() && form.reference &&
    form.position && form.foot
  );

  const initials = (form.firstName[0] ?? '') + (form.lastName[0] ?? '');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
            title="Volver al panel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-900 flex items-center justify-center relative">
              <Trophy className="w-5 h-5 text-white" strokeWidth={2} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold text-blue-900">
                Liga<span className="text-orange-500">.</span>9
              </div>
              <div className="text-[10px] font-mono text-slate-500 tracking-widest">MI PERFIL</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">

        {/* Avatar + nombre */}
        <div className="bg-white border border-slate-200 p-6 flex items-center gap-6">
          <div className="relative flex-shrink-0">
            {avatarPreview ? (
              <div className="relative">
                <div className="w-24 h-24 overflow-hidden border-2 border-white shadow-md">
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                {avatarPending && (
                  <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                    <div className="bg-white text-xs font-medium px-2 py-1">...</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 h-24 bg-blue-100 text-blue-900 flex items-center justify-center font-serif font-bold text-3xl shadow-inner">
                {initials || 'JG'}
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={avatarPending}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-900 text-white flex items-center justify-center hover:bg-blue-800 shadow disabled:opacity-50"
              title="Cambiar foto"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleAvatarFile(e.target.files?.[0] ?? null)}
              className="hidden"
              disabled={avatarPending}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-serif text-xl font-bold text-slate-900 truncate">
              {form.firstName} {form.lastName}
              {form.nickname && (
                <span className="text-slate-400 font-normal text-base"> "{form.nickname}"</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {form.position && (
                <span className="font-mono text-[10px] font-bold bg-blue-900 text-white px-2 py-0.5 tracking-widest">
                  {form.position}
                </span>
              )}
              {teamName && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 text-white"
                  style={{ background: teamColor ?? '#1e3a8a' }}
                >
                  {teamName}
                </span>
              )}
            </div>
            {player.score != null && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="font-display text-2xl text-blue-900 leading-none">{player.score}</span>
                <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">/15 PUNTAJE</span>
              </div>
            )}
          </div>
        </div>

        {/* Sección: Datos personales */}
        <Section title="Datos personales" mono="EDITABLE">
          <div className="grid grid-cols-2 gap-4">
            <Field icon={User} label="Nombre" required
              value={form.firstName} onChange={v => update({ firstName: v })}
              error={fieldErrors.firstName?.[0]} placeholder="Lucas"
            />
            <Field icon={User} label="Apellido" required
              value={form.lastName} onChange={v => update({ lastName: v })}
              error={fieldErrors.lastName?.[0]} placeholder="Morales"
            />
            <Field icon={Star} label="Apodo"
              value={form.nickname} onChange={v => update({ nickname: v })}
              placeholder="Cómo te conocen en la cancha"
              hint="Se muestra en estadísticas públicas"
            />
            <Field icon={CreditCard} label="DNI" required
              value={form.dni} onChange={v => update({ dni: v })}
              error={fieldErrors.dni?.[0]} placeholder="35.842.113"
            />
            <Field icon={Cake} label="Fecha de nacimiento" required type="date"
              value={form.birthDate} onChange={v => update({ birthDate: v })}
              error={fieldErrors.birthDate?.[0]}
            />
            <Field icon={Phone} label="Teléfono" required
              value={form.phone} onChange={v => update({ phone: v })}
              error={fieldErrors.phone?.[0]} placeholder="+54 9 11 ..."
            />
          </div>

          <div className="mt-4">
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-2">
              Vínculo con el colegio <span className="text-orange-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REFERENCES.map(r => {
                const active = form.reference === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update({ reference: r.value })}
                    className={`px-3 py-2.5 text-xs font-medium text-left border flex items-center gap-2 transition-all ${
                      active
                        ? 'border-blue-700 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <GraduationCap className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span>{r.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-blue-700 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Sección: Datos futbolísticos */}
        <Section title="En la cancha" mono="EDITABLE">
          <div className="mb-5">
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-3">
              Posición preferida <span className="text-orange-600">*</span>
            </label>
            <div className="grid grid-cols-7 gap-2">
              {POSITIONS.map(p => {
                const active = form.position === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => update({ position: p.key })}
                    className={`aspect-square flex flex-col items-center justify-center p-2 border transition-all ${
                      active
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className={`font-serif font-bold text-lg ${active ? 'text-orange-700' : 'text-slate-700'}`}>
                      {p.key}
                    </div>
                    <div className="text-[9px] text-slate-500 text-center leading-tight mt-1">{p.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-3">
              Pie hábil <span className="text-orange-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {FEET.map(f => {
                const active = form.foot === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => update({ foot: f.value })}
                    className={`py-3 border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      active
                        ? 'border-blue-700 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <Footprints className="w-4 h-4" /> {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Feedback + botón guardar */}
        <div className="space-y-3">
          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>{saveError}</div>
            </div>
          )}
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cambios guardados correctamente.
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave || savePending}
            className={`w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              canSave && !savePending
                ? 'bg-blue-900 text-white hover:bg-blue-800'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {savePending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {/* Info de solo lectura */}
        <Section title="Información del torneo" mono="SOLO LECTURA">
          <div className="space-y-2 text-sm">
            <InfoRow label="Email" value={userEmail} mono />
            {activeTournament ? (
              <InfoRow label="Torneo" value={`${activeTournament.name} · ${activeTournament.year}`} />
            ) : (
              <InfoRow label="Torneo" value="Sin torneo activo" />
            )}
            <InfoRow
              label="Inscripción"
              value={REG_LABELS[registrationStatus] ?? registrationStatus}
              highlight={registrationStatus === 'approved' ? 'green' : registrationStatus === 'rejected' ? 'red' : undefined}
            />
            {teamName && <InfoRow label="Equipo" value={teamName} dot={teamColor ?? undefined} />}
            {player.score != null && (
              <InfoRow label="Puntaje" value={`${player.score} / 15`} mono />
            )}
          </div>
        </Section>

      </main>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function Section({ title, mono, children }: { title: string; mono: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="font-semibold text-sm text-slate-900">{title}</span>
        <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase">{mono}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({
  icon: Icon, label, type, placeholder, value, onChange, error, hint, required,
}: {
  icon: React.ElementType;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
        {label} {required && <span className="text-orange-600">*</span>}
      </label>
      <div className={`relative flex items-center border bg-white ${error ? 'border-red-400' : 'border-slate-200 focus-within:border-blue-700'}`}>
        <Icon className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0" />
        <input
          type={type ?? 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        />
      </div>
      {error && <div className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</div>}
      {hint && !error && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

function InfoRow({
  label, value, mono, highlight, dot,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: 'green' | 'red';
  dot?: string;
}) {
  const valueClass = highlight === 'green'
    ? 'text-emerald-700 font-semibold'
    : highlight === 'red'
    ? 'text-red-600 font-semibold'
    : mono
    ? 'font-mono text-[11px] text-slate-700'
    : 'text-slate-700';

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-right ${valueClass} flex items-center gap-1.5`}>
        {dot && <span className="w-2 h-2 rounded-sm flex-shrink-0 inline-block" style={{ background: dot }} />}
        {value}
      </span>
    </div>
  );
}
