import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-brand-blue mx-auto mb-6 flex items-center justify-center relative">
          <Trophy className="w-8 h-8 text-white" strokeWidth={2} />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-orange" />
        </div>

        <div className="font-mono text-[10px] text-brand-orange tracking-widest font-semibold mb-2">
          APERTURA 2026 · EN CURSO
        </div>
        <h1 className="font-serif text-4xl font-bold mb-3 text-brand-blue">
          Liga.9
        </h1>
        <p className="text-sm text-slate-600 mb-8">
          El torneo de fútbol 9 del colegio. Seguí todo lo que pasa en la cancha.
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="w-full bg-brand-blue text-white py-3 px-5 font-medium text-sm hover:bg-brand-blue-dark flex items-center justify-center gap-2"
          >
            Ingresar <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/fixture"
            className="w-full border border-slate-200 text-slate-700 py-3 px-5 font-medium text-sm hover:bg-white flex items-center justify-center"
          >
            Ver fixture público
          </Link>
        </div>

        <div className="mt-12 text-xs text-slate-400">
          🚧 Sitio en construcción. Pronto, todo el torneo acá.
        </div>
      </div>
    </div>
  );
}
