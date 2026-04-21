'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Trophy } from 'lucide-react';
import { login } from '@/lib/actions/auth';

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (!result.success) {
        setError(result.error ?? 'Algo salió mal');
      }
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Lado visual */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-brand-blue via-blue-800 to-brand-blue-dark text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 rounded-full -translate-y-48 translate-x-48" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-white flex items-center justify-center relative">
            <Trophy className="w-6 h-6 text-brand-blue" strokeWidth={2} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-orange" />
          </div>
          <div>
            <div className="font-serif text-xl font-bold leading-none">
              Liga<span className="text-brand-orange-light">.</span>9
            </div>
            <div className="text-[10px] font-mono text-blue-200 mt-1 tracking-widest">
              FÚTBOL 9 · 2026
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <div className="font-mono text-[10px] text-brand-orange-light tracking-widest font-semibold mb-3">
            TEMPORADA 2026
          </div>
          <h1 className="font-serif text-5xl font-bold mb-6 leading-tight">
            El torneo vive<br />en tu bolsillo.
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Consultá tu fixture, seguí tus estadísticas y mantenete al día con cada fecha.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          <div>
            <div className="font-serif font-bold text-3xl">288</div>
            <div className="text-[10px] font-mono text-blue-200 tracking-widest">JUGADORES</div>
          </div>
          <div>
            <div className="font-serif font-bold text-3xl">24</div>
            <div className="text-[10px] font-mono text-blue-200 tracking-widest">EQUIPOS</div>
          </div>
          <div>
            <div className="font-serif font-bold text-3xl">4</div>
            <div className="text-[10px] font-mono text-blue-200 tracking-widest">CANCHAS</div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="font-mono text-[10px] text-brand-orange tracking-widest font-semibold mb-2">
            INGRESAR
          </div>
          <h2 className="font-serif text-3xl font-bold mb-2">Bienvenido de vuelta</h2>
          <p className="text-sm text-slate-500 mb-8">
            Accedé con tu cuenta para ver tu fixture y estadísticas.
          </p>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                Email
              </label>
              <div className="relative flex items-center border border-slate-200 bg-white focus-within:border-brand-blue">
                <Mail className="w-4 h-4 text-slate-400 ml-3" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="tu@email.com"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                Contraseña
              </label>
              <div className="relative flex items-center border border-slate-200 bg-white focus-within:border-brand-blue">
                <Lock className="w-4 h-4 text-slate-400 ml-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="mr-3 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" name="remember" className="rounded border-slate-300" />
                Recordarme
              </label>
              <Link href="/forgot-password" className="text-brand-blue hover:underline font-medium">
                ¿Olvidaste la contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-brand-blue text-white py-3 font-medium text-sm hover:bg-brand-blue-dark flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? 'Ingresando...' : <>Ingresar <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-brand-blue font-semibold hover:underline">
              Registrate acá
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
