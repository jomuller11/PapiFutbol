'use client';

import { useState, useTransition, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  Camera, ArrowRight, AlertCircle, Upload, X, Check,
} from 'lucide-react';
import { uploadAvatar } from '@/lib/actions/players';

type Props = {
  state: {
    firstName: string;
    lastName: string;
    nickname: string;
    dni: string;
    birthDate: string;
    phone: string;
    reference: string;
    position: string;
    foot: string;
    avatarUrl: string | null;
  };
  update: (patch: Partial<Props['state']>) => void;
  userEmail: string;
  onComplete: () => void;
};

export function Step3Photo({ state, update, userEmail, onComplete }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(state.avatarUrl);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    setError(null);
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Solo JPG, PNG o WEBP.');
      return;
    }

    // Preview local inmediato
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload al servidor
    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const result = await uploadAvatar(formData);
      if (!result.success) {
        setError(result.error ?? 'No pudimos subir tu foto.');
        setPreview(state.avatarUrl); // revertir preview
        return;
      }
      // Ya está guardada en la DB, revalidatePath desde la action refrescará
      // la próxima navegación. Actualizamos el estado local del wizard.
      // Nota: publicUrl exacta la sabe el server, pero acá con el preview basta.
    });
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const removePreview = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const initials =
    (state.firstName[0] ?? '') + (state.lastName[0] ?? '');

  return (
    <>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-orange-600 tracking-widest font-semibold mb-2">
          PASO 3 DE 4
        </div>
        <h2 className="font-serif text-2xl font-bold mb-1">Tu foto de perfil</h2>
        <p className="text-sm text-slate-500">
          Opcional, pero ayuda a que te reconozcan. Podés cambiarla después.
        </p>
      </div>

      <div className="flex flex-col items-center py-6">
        {preview ? (
          <div className="relative group">
            <div className="w-40 h-40 overflow-hidden border-4 border-white shadow-md">
              {/* Usamos img nativo porque el preview puede ser data: URL */}
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            {!isPending && (
              <button
                onClick={removePreview}
                className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isPending && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                <div className="bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  Subiendo...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`w-40 h-40 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative ${
              dragActive
                ? 'border-blue-700 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-700 hover:text-blue-700'
            }`}
          >
            {/* Iniciales como fallback visual */}
            <div className="absolute font-serif font-bold text-4xl text-slate-200 pointer-events-none">
              {initials || 'LM'}
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-xs font-medium">Subir foto</span>
              <span className="text-[10px] text-slate-400 mt-0.5">o arrastrala acá</span>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onInputChange}
          className="hidden"
          disabled={isPending}
        />

        {preview && !isPending && (
          <button
            onClick={() => inputRef.current?.click()}
            type="button"
            className="mt-4 text-xs text-blue-700 hover:underline font-medium flex items-center gap-1"
          >
            <Upload className="w-3 h-3" /> Cambiar foto
          </button>
        )}

        <div className="text-xs text-slate-500 text-center mt-4 max-w-xs">
          JPG, PNG o WEBP · Máximo 5MB
          <br />
          Recomendado: cuadrada, 400x400px
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Resumen */}
      <div className="bg-slate-50 border border-slate-200 p-4 text-xs mt-4">
        <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">
          Resumen de tu perfil
        </div>
        <div className="space-y-1 text-slate-700">
          <SummaryRow
            label="Nombre"
            value={`${state.firstName} ${state.lastName}${state.nickname ? ` ("${state.nickname}")` : ''}`}
          />
          <SummaryRow label="DNI" value={state.dni} mono />
          <SummaryRow label="Email" value={userEmail} mono />
          <SummaryRow label="Teléfono" value={state.phone} mono />
          <SummaryRow
            label="Posición"
            value={`${state.position} · Pie ${state.foot}`}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onComplete}
          disabled={isPending}
          className="bg-blue-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-800 flex items-center gap-2 disabled:opacity-50"
        >
          {preview ? 'Siguiente' : 'Saltar paso'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}:</span>
      <span className={`font-medium text-right truncate ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value}
      </span>
    </div>
  );
}
