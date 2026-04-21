'use client';

import { useState, useTransition } from 'react';
import {
  User, Star, CreditCard, Cake, Phone, GraduationCap, Check,
  ArrowRight, AlertCircle,
} from 'lucide-react';
import { completePlayerProfile } from '@/lib/actions/players';

const REFERENCES: { value: string; label: string }[] = [
  { value: 'padre_alumno', label: 'Padre de Alumno' },
  { value: 'padre_ex_alumno', label: 'Padre de Ex Alumno' },
  { value: 'ex_alumno', label: 'Ex Alumno' },
  { value: 'docente_colegio', label: 'Docente del Colegio' },
  { value: 'invitado', label: 'Invitado' },
  { value: 'hermano_marista', label: 'Hermano Marista' },
  { value: 'esposo_educadora', label: 'Esposo de Educadora' },
  { value: 'abuelo_alumno', label: 'Abuelo de Alumno' },
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

export function Step1PersonalData({ state, update, onComplete }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const canContinue = Boolean(
    state.firstName.trim() && state.lastName.trim() && state.dni.trim() &&
    state.birthDate && state.phone.trim() && state.reference
  );

  const handleContinue = () => {
    setError(null);
    setFieldErrors({});

    // Si el Paso 2 aún no fue completado (primera vez), igual tenemos que
    // mandar valores por defecto de position/foot porque el schema los requiere.
    // Solución: guardamos los datos en estado local y recién persistimos al terminar paso 2.
    // Por eso, en el paso 1 sólo avanzamos sin llamar al server.
    onComplete();
  };

  return (
    <>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-orange-600 tracking-widest font-semibold mb-2">
          PASO 1 DE 4
        </div>
        <h2 className="font-serif text-2xl font-bold mb-1">Contanos quién sos</h2>
        <p className="text-sm text-slate-500">
          Estos datos quedan privados, solo el admin puede verlos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field
          icon={User} label="Nombre" required
          value={state.firstName}
          onChange={v => update({ firstName: v })}
          error={fieldErrors.firstName?.[0]}
          placeholder="Lucas"
        />
        <Field
          icon={User} label="Apellido" required
          value={state.lastName}
          onChange={v => update({ lastName: v })}
          error={fieldErrors.lastName?.[0]}
          placeholder="Morales"
        />
        <Field
          icon={Star} label="Apodo"
          value={state.nickname}
          onChange={v => update({ nickname: v })}
          placeholder="Cómo te conocen en la cancha"
          hint="Se muestra en estadísticas públicas"
        />
        <Field
          icon={CreditCard} label="DNI" required
          value={state.dni}
          onChange={v => update({ dni: v })}
          error={fieldErrors.dni?.[0]}
          placeholder="35.842.113"
        />
        <Field
          icon={Cake} label="Fecha de nacimiento" required type="date"
          value={state.birthDate}
          onChange={v => update({ birthDate: v })}
          error={fieldErrors.birthDate?.[0]}
        />
        <Field
          icon={Phone} label="Teléfono" required
          value={state.phone}
          onChange={v => update({ phone: v })}
          error={fieldErrors.phone?.[0]}
          placeholder="+54 9 11 ..."
        />
      </div>

      {/* Referencia */}
      <div className="mb-6">
        <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
          Referencia <span className="text-orange-600">*</span>
        </label>
        <div className="text-xs text-slate-500 mb-2">¿Cuál es tu vínculo con el colegio?</div>
        <div className="grid grid-cols-2 gap-2">
          {REFERENCES.map(r => {
            const active = state.reference === r.value;
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

// Field component genérico
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
      <div
        className={`relative flex items-center border bg-white ${
          error ? 'border-red-400' : 'border-slate-200 focus-within:border-blue-700'
        }`}
      >
        <Icon className="w-4 h-4 text-slate-400 ml-3" />
        <input
          type={type || 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        />
      </div>
      {error && (
        <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}
      {hint && !error && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
