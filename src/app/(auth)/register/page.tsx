'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, AlertCircle, Trophy } from 'lucide-react';
import { register } from '@/lib/actions/auth';

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const passStrength = pass.length === 0 ? 0 : pass.length < 6 ? 1 : pass.length < 10 ? 2 : 3;
  const strengthColors = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-emerald-500'];
  const strengthLabels = ['', 'Débil', 'Media', 'Fuerte'];

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passMatch = pass2.length > 0 && pass === pass2;
  const canSubmit = emailValid && pass.length >= 6 && passMatch && accepted;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await register(formData);
      if (!result.success) {
        setError(result.error ?? 'No pudimos crear tu cuenta');
      }
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative bg-gradient-to-br from-brand-blue via-blue-800 to-brand-blue-dark text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 rounded-full -translate-y-48 translate-x-48" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-white flex items-center justify-center relative">
            <Trophy className="w-6 h-6 text-brand-blue" strokeWidth={2} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-orange" />
          </div>
          <div>
            <div className="font-serif text-xl font-bold leading-none">Liga<span className="text-brand-orange-light">.</span>9</div>
            <div className="text-[10px] font-mono text-blue-200 mt-1 tracking-widest">FÚTBOL 9 · 2026</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <div className="font-mono text-[10px] text-brand-orange-light tracking-widest font-semibold mb-3">SUMATE AL TORNEO</div>
          <h1 className="font-serif text-5xl font-bold mb-6 leading-tight">Creá tu cuenta<br />y a jugar.</h1>
          <p className="text-blue-100 text-sm leading-relaxed">Registrate para después inscribirte al torneo activo. Una vez aprobado por el admin, quedás listo para el sorteo.</p>
        </div>
        <div className="relative text-xs text-blue-200">© 2026 · Liga.9 · Colegio Marista</div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="font-mono text-[10px] text-brand-orange tracking-widest font-semibold mb-2">CREAR CUENTA</div>
          <h2 className="font-serif text-3xl font-bold mb-2">Sumate al torneo</h2>
          <p className="text-sm text-slate-500 mb-8">Creá tu cuenta para después inscribirte al torneo activo.</p>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">Email</label>
              <div className={`relative flex items-center border bg-white ${emailValid ? 'border-emerald-400' : 'border-slate-200 focus-within:border-brand-blue'}`}>
                <Mail className="w-4 h-4 text-slate-400 ml-3" />
                <input
                  type="email" name="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                />
                {emailValid && <Check className="w-4 h-4 text-emerald-600 mr-3" />}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">Contraseña</label>
              <div className="relative flex items-center border border-slate-200 bg-white focus-within:border-brand-blue">
                <Lock className="w-4 h-4 text-slate-400 ml-3" />
                <input
                  type={showPass ? 'text' : 'password'} name="password" required value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="mr-3 text-slate-400 hover:text-slate-700">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pass.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(n => (
                      <div key={n} className={`h-1 flex-1 ${n <= passStrength ? strengthColors[passStrength] : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Fuerza: <span className={passStrength === 3 ? 'text-emerald-600' : passStrength === 2 ? 'text-orange-600' : 'text-red-600'}>{strengthLabels[passStrength]}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">Confirmar contraseña</label>
              <div className={`relative flex items-center border bg-white ${pass2.length > 0 && !passMatch ? 'border-red-400 bg-red-50/30' : passMatch ? 'border-emerald-400' : 'border-slate-200 focus-within:border-brand-blue'}`}>
                <Lock className="w-4 h-4 text-slate-400 ml-3" />
                <input
                  type="password" name="confirmPassword" required value={pass2} onChange={e => setPass2(e.target.value)}
                  placeholder="Repetí la contraseña"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                />
                {passMatch && <Check className="w-4 h-4 text-emerald-600 mr-3" />}
              </div>
              {pass2.length > 0 && !passMatch && (
                <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Las contraseñas no coinciden
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer pt-2">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="rounded border-slate-300 mt-0.5" />
              <span>Acepto los <Link href="/terms" className="text-brand-blue hover:underline">términos y condiciones</Link> y la <Link href="/privacy" className="text-brand-blue hover:underline">política de privacidad</Link>.</span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3">{error}</div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className={`w-full py-3 font-medium text-sm flex items-center justify-center gap-2 ${
                canSubmit && !isPending ? 'bg-brand-blue text-white hover:bg-brand-blue-dark' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isPending ? 'Creando cuenta...' : <>Crear cuenta <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-brand-blue font-semibold hover:underline">Ingresá acá</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
