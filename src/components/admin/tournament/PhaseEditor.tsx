'use client';

import { useState, useTransition } from 'react';
import { X, Save, AlertCircle, Hash, Trophy, Users } from 'lucide-react';
import { createPhase, updatePhase } from '@/lib/actions/tournament';

export type Phase = {
  id: string;
  tournament_id: string;
  name: string;
  type: 'groups' | 'bracket';
  order: number;
  status: 'pending' | 'active' | 'finished';
};

type Props = {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  // Si phase está presente, el editor está en modo edición.
  phase?: Phase | null;
  // Orden sugerido para nueva fase (cantidad actual + 1).
  suggestedOrder?: number;
};

export function PhaseEditor({ open, onClose, tournamentId, phase, suggestedOrder = 1 }: Props) {
  const isEdit = !!phase;
  const [name, setName] = useState(phase?.name ?? '');
  const [type, setType] = useState<'groups' | 'bracket'>(phase?.type ?? 'groups');
  const [order, setOrder] = useState<number>(phase?.order ?? suggestedOrder);
  const [cupCount, setCupCount] = useState<number>(3);
  const [cupNames, setCupNames] = useState<string[]>(['Copa de Oro', 'Copa de Plata', 'Copa de Bronce']);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Resetear cuando cambia la prop phase (al abrir para otra fase)
  if (open && phase && phase.name !== name && name === '' && !isPending) {
    setName(phase.name);
    setType(phase.type);
    setOrder(phase.order);
  }

  if (!open) return null;

  const canSubmit = name.trim().length >= 2 && order >= 1;

  const handleSubmit = () => {
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('type', type);
    formData.append('order', order.toString());

    if (!isEdit && type === 'bracket') {
      cupNames.slice(0, cupCount).forEach((cupName) => {
        formData.append('cup_names', cupName.trim());
      });
    }

    if (isEdit && phase) {
      formData.append('phaseId', phase.id);
    } else {
      formData.append('tournamentId', tournamentId);
    }

    startTransition(async () => {
      const result = isEdit ? await updatePhase(formData) : await createPhase(formData);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setError(result.error ?? 'No pudimos guardar la fase.');
        return;
      }

      // Limpiar y cerrar
      setName('');
      setType('groups');
      setOrder(suggestedOrder);
      setCupCount(3);
      setCupNames(['Copa de Oro', 'Copa de Plata', 'Copa de Bronce']);
      onClose();
    });
  };

  const handleClose = () => {
    if (isPending) return;
    setName('');
    setType('groups');
    setOrder(suggestedOrder);
    setCupCount(3);
    setCupNames(['Copa de Oro', 'Copa de Plata', 'Copa de Bronce']);
    setError(null);
    setFieldErrors({});
    onClose();
  };

  const updateCupName = (index: number, value: string) => {
    setCupNames((prev) => {
      const next = [...prev];
      while (next.length < Math.max(cupCount, index + 1)) next.push('');
      next[index] = value;
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-md border border-slate-200 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white p-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full -translate-y-20 translate-x-20" />
          <button
            onClick={handleClose}
            disabled={isPending}
            className="absolute top-3 right-3 w-7 h-7 bg-white/10 hover:bg-white/20 flex items-center justify-center z-10 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative">
            <div className="font-mono text-[10px] text-orange-400 tracking-widest font-semibold mb-1">
              {isEdit ? 'EDITAR FASE' : 'NUEVA FASE'}
            </div>
            <div className="font-serif font-bold text-xl">
              {isEdit ? phase.name : 'Agregar una fase al torneo'}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
              Nombre de la fase <span className="text-orange-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='Ej: "Fase de Grupos", "Cuartos de Final"'
              disabled={isPending}
              className={`w-full border px-3 py-2 text-sm focus:outline-none ${
                fieldErrors.name ? 'border-red-400' : 'border-slate-200 focus:border-blue-700'
              }`}
            />
            {fieldErrors.name && (
              <div className="text-xs text-red-600 mt-1">{fieldErrors.name[0]}</div>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-2">
              Tipo de fase <span className="text-orange-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('groups')}
                disabled={isPending}
                className={`p-3 border text-left flex items-start gap-2 transition-colors ${
                  type === 'groups'
                    ? 'border-blue-700 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Grupos</div>
                  <div className="text-[10px] text-slate-500">Zonas con todos contra todos</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType('bracket')}
                disabled={isPending}
                className={`p-3 border text-left flex items-start gap-2 transition-colors ${
                  type === 'bracket'
                    ? 'border-blue-700 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <Trophy className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Eliminatoria</div>
                  <div className="text-[10px] text-slate-500">Llave directa</div>
                </div>
              </button>
            </div>
            {isEdit && phase && phase.status !== 'pending' && (
              <div className="text-[10px] text-amber-700 mt-2 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>No podés cambiar el tipo porque la fase ya comenzó.</span>
              </div>
            )}
          </div>

          {/* Orden */}
          <div>
            <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
              Orden <span className="text-orange-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <input
                type="number"
                min={1}
                max={20}
                value={order}
                onChange={e => setOrder(Number(e.target.value))}
                disabled={isPending}
                className={`w-20 border px-3 py-2 text-sm focus:outline-none ${
                  fieldErrors.order ? 'border-red-400' : 'border-slate-200 focus:border-blue-700'
                }`}
              />
              <span className="text-xs text-slate-500">
                Posición en la secuencia del torneo (1 = primera)
              </span>
            </div>
            {fieldErrors.order && (
              <div className="text-xs text-red-600 mt-1">{fieldErrors.order[0]}</div>
            )}
          </div>

          {type === 'groups' && !isEdit && (
            <div className="bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                Las zonas se agregan después, desde la misma fase una vez creada.
              </div>
            </div>
          )}

          {type === 'bracket' && !isEdit && (
            <div className="space-y-3 border border-slate-200 p-4 bg-slate-50">
              <div>
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-2">
                  Copas de la fase
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setCupCount(count)}
                      disabled={isPending}
                      className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                        cupCount === count
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {count} {count === 1 ? 'copa' : 'copas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {Array.from({ length: cupCount }, (_, index) => (
                  <div key={index}>
                    <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-1">
                      Copa {index + 1}
                    </label>
                    <input
                      type="text"
                      value={cupNames[index] ?? ''}
                      onChange={(e) => updateCupName(index, e.target.value)}
                      placeholder={`Nombre de la copa ${index + 1}`}
                      disabled={isPending}
                      className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-700 bg-white"
                    />
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-slate-500 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Después de crear la fase vas a poder cargar los cruces manualmente para cada copa.</span>
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
        <div className="border-t border-slate-200 p-4 flex items-center justify-end gap-2 bg-slate-50">
          <button
            onClick={handleClose}
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
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear fase'}
          </button>
        </div>
      </div>
    </div>
  );
}
