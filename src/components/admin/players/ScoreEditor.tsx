'use client';

import { useState, useTransition, useEffect } from 'react';
import { X, Star, Save, AlertCircle, Trash2, Info } from 'lucide-react';
import { updatePlayerScore } from '@/lib/actions/admin';
import type { PlayerWithStats } from '@/app/admin/players/page';

type Props = {
  open: boolean;
  onClose: () => void;
  player: PlayerWithStats;
};

export function ScoreEditor({ open, onClose, player }: Props) {
  const initial = player.score ?? 8;
  const [value, setValue] = useState<number>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(player.score ?? 8);
      setError(null);
    }
  }, [open, player.score]);

  if (!open) return null;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePlayerScore(player.id, value);
      if (!result.success) {
        setError(result.error ?? 'No pudimos guardar');
        return;
      }
      onClose();
    });
  };

  const handleClear = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePlayerScore(player.id, null);
      if (!result.success) {
        setError(result.error ?? 'No pudimos guardar');
        return;
      }
      onClose();
    });
  };

  const colorClass =
    value >= 13 ? 'text-orange-600' : value >= 10 ? 'text-blue-800' : 'text-slate-600';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md border border-slate-200 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white p-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full -translate-y-20 translate-x-20" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-white/10 hover:bg-white/20 flex items-center justify-center z-10"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative">
            <div className="font-mono text-[10px] text-orange-400 tracking-widest font-semibold mb-1">
              EVALUACIÓN · PUNTAJE 1-15
            </div>
            <div className="font-serif font-bold text-xl">
              {player.first_name} {player.last_name}
            </div>
            <div className="text-xs text-blue-200 mt-0.5">
              {player.position} · DNI {player.dni}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Número grande */}
          <div className="text-center mb-6">
            <div
              className={`font-serif font-bold text-7xl leading-none ${colorClass} transition-colors`}
            >
              {value}
              <span className="text-2xl text-slate-300 ml-1">/15</span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 tracking-widest mt-2">
              {value >= 13 ? 'NIVEL TOP' : value >= 10 ? 'BUEN NIVEL' : value >= 7 ? 'NIVEL MEDIO' : 'NIVEL INICIAL'}
            </div>
          </div>

          {/* Slider */}
          <div className="mb-6">
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={value}
              onChange={e => setValue(Number(e.target.value))}
              disabled={isPending}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 px-0.5">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
            </div>
          </div>

          {/* Botones numéricos rápidos */}
          <div className="grid grid-cols-5 gap-1 mb-6">
            {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setValue(n)}
                disabled={isPending}
                className={`py-1.5 text-xs font-semibold transition-colors ${
                  value === n
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900 mb-4">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              El puntaje se usa para balancear equipos en el sorteo. El jugador puede verlo en su
              perfil pero no modificarlo.
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex items-center justify-between bg-slate-50">
          {player.score !== null ? (
            <button
              onClick={handleClear}
              disabled={isPending}
              className="text-xs text-red-600 hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Borrar puntaje
            </button>
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
              onClick={handleSave}
              disabled={isPending || value === (player.score ?? -1)}
              className="bg-blue-900 text-white px-5 py-2 text-sm font-medium hover:bg-blue-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? 'Guardando...' : 'Guardar puntaje'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
