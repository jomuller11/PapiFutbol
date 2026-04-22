'use client';

import { useState, useTransition, useRef, type ChangeEvent, useEffect } from 'react';
import {
  X, Save, AlertCircle, Trash2, MapPin,
  ImagePlus, Check, Users, Settings,
} from 'lucide-react';
import {
  createTeam, updateTeam, deleteTeam, uploadTeamLogo,
} from '@/lib/actions/teams';
import { TEAM_COLORS } from '@/lib/constants';
import { RosterPanel } from './RosterPanel';
import type { TeamWithRoster, GroupOption, AvailablePlayer } from '@/app/admin/teams/page';

type Props = {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  groups: GroupOption[];
  team?: TeamWithRoster | null;
  availablePlayers?: AvailablePlayer[];
};

type Tab = 'datos' | 'plantel';

export function TeamEditor({ open, onClose, tournamentId, groups, team, availablePlayers = [] }: Props) {
  const isEdit = !!team;

  const [tab, setTab] = useState<Tab>('datos');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState<string>(TEAM_COLORS[0].hex);
  const [groupId, setGroupId] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const [zoneWarning, setZoneWarning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTab('datos');
      setName(team?.name ?? '');
      setShortName(team?.short_name ?? '');
      setColor(team?.color ?? TEAM_COLORS[0].hex);
      setGroupId(team?.group_id ?? '');
      setLogoUrl(team?.logo_url ?? null);
      setLogoFile(null);
      setLogoPreview(null);
      setError(null);
      setFieldErrors({});
      setZoneWarning(false);
      setConfirmDelete(false);
    }
  }, [open, team?.id]);

  if (!open) return null;

  const canSubmit = name.trim().length >= 2 && shortName.trim().length >= 2;
  const originalGroupId = team?.group_id ?? '';
  const zoneChanged = isEdit && groupId !== originalGroupId;

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no puede superar 2MB.');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = () => {
    setError(null);
    setFieldErrors({});

    if (zoneChanged && !zoneWarning) {
      setZoneWarning(true);
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('short_name', shortName.trim().toUpperCase());
    formData.append('color', color);
    if (groupId) formData.append('group_id', groupId);

    if (isEdit && team) {
      formData.append('team_id', team.id);
    } else {
      formData.append('tournament_id', tournamentId);
    }

    startTransition(async () => {
      const result = isEdit ? await updateTeam(formData) : await createTeam(formData);

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setZoneWarning(false);
        return;
      }

      const teamId = isEdit ? team!.id : (result as any).data?.id;

      if (logoFile && teamId) {
        const logoForm = new FormData();
        logoForm.append('team_id', teamId);
        logoForm.append('file', logoFile);
        const logoResult = await uploadTeamLogo(logoForm);
        if (!logoResult.success) {
          setError('El equipo se guardó, pero el logo no se pudo subir: ' + logoResult.error);
          return;
        }
      }

      onClose();
    });
  };

  const handleDelete = () => {
    if (!team) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTeam(team.id);
      if (!result.success) {
        setError(result.error);
        setConfirmDelete(false);
        return;
      }
      onClose();
    });
  };

  const displayLogo = logoPreview ?? logoUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto"
      onClick={() => !isPending && onClose()}
    >
      <div
        className="bg-white w-full max-w-2xl border border-slate-200 shadow-xl my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative p-5 overflow-hidden transition-colors"
          style={{ backgroundColor: color }}
        >
          <button
            onClick={() => !isPending && onClose()}
            disabled={isPending}
            className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 text-white flex items-center justify-center disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-white">
            <div className="font-mono text-[10px] tracking-widest font-semibold opacity-80 mb-1">
              {isEdit ? 'EDITAR EQUIPO' : 'NUEVO EQUIPO'}
            </div>
            <div className="font-serif font-bold text-xl drop-shadow-sm">
              {name || shortName || 'Equipo sin nombre'}
            </div>
          </div>
        </div>

        {/* Tabs (solo en edición) */}
        {isEdit && (
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setTab('datos')}
              className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold font-mono tracking-wider border-b-2 transition-colors ${
                tab === 'datos'
                  ? 'border-blue-900 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> DATOS
            </button>
            <button
              onClick={() => setTab('plantel')}
              className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold font-mono tracking-wider border-b-2 transition-colors ${
                tab === 'plantel'
                  ? 'border-blue-900 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> PLANTEL
              <span className="ml-1 font-mono text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5">
                {team?.members.length ?? 0}
              </span>
            </button>
          </div>
        )}

        {/* Tab: Plantel */}
        {tab === 'plantel' && team && (
          <>
            <RosterPanel
              teamId={team.id}
              members={team.members}
              availablePlayers={availablePlayers}
            />
            <div className="border-t border-slate-200 p-4 flex justify-end bg-slate-50">
              <button
                onClick={onClose}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </>
        )}

        {/* Tab: Datos */}
        {tab === 'datos' && (
          <>
            <div className="p-6 space-y-5">
              {/* Logo */}
              <div>
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-2">
                  Logo (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => inputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 cursor-pointer hover:border-blue-700 relative overflow-hidden flex-shrink-0"
                  >
                    {displayLogo ? (
                      <img src={displayLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-[9px] font-mono mt-1">Subir</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-xs text-slate-500">
                    <div>PNG, JPG, WEBP o SVG · Máximo 2MB</div>
                    <div>Recomendado: cuadrado 200×200px</div>
                    {displayLogo && (
                      <button
                        onClick={clearLogo}
                        className="mt-2 text-red-600 hover:underline font-medium text-[11px] flex items-center gap-1"
                        type="button"
                      >
                        <Trash2 className="w-3 h-3" /> Quitar logo
                      </button>
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Nombre + sigla */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                    Nombre del equipo <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Los Tigres"
                    maxLength={60}
                    disabled={isPending}
                    className={`w-full border px-3 py-2 text-sm focus:outline-none ${
                      fieldErrors.name ? 'border-red-400' : 'border-slate-200 focus:border-blue-700'
                    }`}
                  />
                  {fieldErrors.name && (
                    <div className="text-xs text-red-600 mt-1">{fieldErrors.name[0]}</div>
                  )}
                </div>
                <div>
                  <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                    Sigla <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={e => setShortName(e.target.value.toUpperCase())}
                    placeholder="TIG"
                    maxLength={4}
                    disabled={isPending}
                    className={`w-full border px-3 py-2 text-sm font-mono font-semibold focus:outline-none ${
                      fieldErrors.short_name ? 'border-red-400' : 'border-slate-200 focus:border-blue-700'
                    }`}
                  />
                  {fieldErrors.short_name && (
                    <div className="text-xs text-red-600 mt-1">{fieldErrors.short_name[0]}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">2-4 caracteres</div>
                </div>
              </div>

              {/* Paleta */}
              <div>
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-2">
                  Color <span className="text-orange-600">*</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {TEAM_COLORS.map(c => {
                    const active = color === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        disabled={isPending}
                        className={`aspect-square flex items-center justify-center transition-all ${
                          active ? 'ring-2 ring-offset-2 ring-slate-900' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {active && <Check className="w-4 h-4 text-white drop-shadow" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {TEAM_COLORS.find(c => c.hex === color)?.name}
                </div>
              </div>

              {/* Zona */}
              <div>
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                  Zona asignada
                </label>
                <select
                  value={groupId}
                  onChange={e => {
                    setGroupId(e.target.value);
                    setZoneWarning(false);
                  }}
                  disabled={isPending || groups.length === 0}
                  className="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-700 disabled:bg-slate-50"
                >
                  <option value="">Sin asignar</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.phase_name} · Zona {g.name}
                    </option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <div className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>Primero tenés que crear zonas en la configuración del torneo.</span>
                  </div>
                )}
                {isEdit && zoneChanged && !zoneWarning && (
                  <div className="text-[10px] text-amber-700 mt-1.5 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>
                      Estás por cambiar la zona de este equipo. Se te pedirá confirmación al guardar.
                    </span>
                  </div>
                )}
              </div>

              {zoneWarning && (
                <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">Confirmá el cambio de zona</div>
                    <div>
                      Estás moviendo este equipo a otra zona. Si hay partidos programados se
                      mantienen, pero los partidos ya jugados bloquean el cambio.
                      Hacé click en "Guardar" de nuevo para confirmar.
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 flex items-center justify-between bg-slate-50">
              {isEdit && !confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                  className="text-xs text-red-600 hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Borrar equipo
                </button>
              ) : isEdit && confirmDelete ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-800 font-medium">¿Borrar {team?.name}?</span>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={isPending}
                    className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
                  >
                    No
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="px-2 py-1 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Sí, borrar
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isPending}
                  className="bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isPending}
                  className="bg-blue-900 text-white px-5 py-2 text-sm font-medium hover:bg-blue-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isPending
                    ? 'Guardando...'
                    : zoneWarning
                    ? 'Confirmar cambio'
                    : isEdit
                    ? 'Guardar cambios'
                    : 'Crear equipo'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
