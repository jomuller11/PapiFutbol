'use client';

import { useState, useTransition } from 'react';
import { Footprints, Info, AlertCircle, ArrowRight, ChevronLeft } from 'lucide-react';
import { completePlayerProfile, type ProfileInput } from '@/lib/actions/players';

const POSITIONS: { key: string; name: string }[] = [
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

type Props = {
  state: {
    firstName: string; lastName: string; nickname: string;
    dni: string; birthDate: string; phone: string; reference: string;
    position: string; foot: string;
  };
  update: (patch: Partial<Props['state']>) => void;
  onComplete: () => void;
};

export function Step2FootballData({ state, update, onComplete }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const canContinue = Boolean(state.position && state.foot);

  const handleContinue = () => {
    setError(null);
    setFieldErrors({});

    // Ahora sí: persistimos todo lo acumulado (pasos 1 + 2) en la DB.
    const input: ProfileInput = {
      firstName: state.firstName,
      lastName: state.lastName,
      nickname: state.nickname || null,
      dni: state.dni,
      birthDate: state.birthDate,
      phone: state.phone,
      reference: state.reference as ProfileInput['reference'],
      position: state.position as ProfileInput['position'],
      foot: state.foot as ProfileInput['foot'],
    };

    startTransition(async () => {
      const result = await completePlayerProfile(input);
      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          setError('Revisá los datos marcados en rojo.');
        } else {
          setError(result.error ?? 'No pudimos guardar tus datos.');
        }
        return;
      }
      onComplete();
    });
  };

  return (
    <>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-orange-600 tracking-widest font-semibold mb-2">
          PASO 2 DE 4
        </div>
        <h2 className="font-serif text-2xl font-bold mb-1">Tu perfil en la cancha</h2>
        <p className="text-sm text-slate-500">
          La posición ayuda al admin a armar equipos balanceados.
        </p>
      </div>

      {/* Posición */}
      <div className="mb-6">
        <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-3">
          Posición preferida <span className="text-orange-600">*</span>
        </label>
        <div className="grid grid-cols-7 gap-2">
          {POSITIONS.map(p => {
            const active = state.position === p.key;
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
                <div className="text-[9px] text-slate-500 text-center leading-tight mt-1">
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pie */}
      <div className="mb-6">
        <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-3">
          Pie hábil <span className="text-orange-600">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {FEET.map(f => {
            const active = state.foot === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => update({ foot: f.value })}
                className={`py-3 border text-sm font-medium flex items-center justify-center gap-2 ${
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

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900 mb-6">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <div>
          Tu <strong>puntaje</strong> (1-15) lo asigna el administrador después de evaluarte en pruebas.
          Vas a poder verlo en tu perfil una vez asignado.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue || isPending}
          className={`px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${
            canContinue && !isPending
              ? 'bg-blue-900 text-white hover:bg-blue-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isPending ? 'Guardando...' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
