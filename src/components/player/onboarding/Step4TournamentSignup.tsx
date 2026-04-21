'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Trophy, Heart, Check, ArrowRight, AlertCircle, AlertTriangle,
  Clock, CircleDashed, CheckCircle2, X,
} from 'lucide-react';
import {
  requestTournamentRegistration,
  cancelTournamentRegistration,
} from '@/lib/actions/players';

type RegistrationStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'waitlist';

type Props = {
  activeTournament: { id: string; name: string } | null;
  registrationStatus: RegistrationStatus;
  rejectionReason: string | null;
};

export function Step4TournamentSignup({
  activeTournament,
  registrationStatus,
  rejectionReason,
}: Props) {
  if (!activeTournament) {
    return <NoActiveTournament />;
  }

  if (registrationStatus === 'pending') {
    return <PendingState tournamentName={activeTournament.name} />;
  }

  if (registrationStatus === 'waitlist') {
    return <WaitlistState tournamentName={activeTournament.name} />;
  }

  return (
    <SignupForm
      tournament={activeTournament}
      wasRejected={registrationStatus === 'rejected'}
      rejectionReason={rejectionReason}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulario de solicitud
// ─────────────────────────────────────────────────────────────────────────────

function SignupForm({
  tournament,
  wasRejected,
  rejectionReason,
}: {
  tournament: { id: string; name: string };
  wasRejected: boolean;
  rejectionReason: string | null;
}) {
  const [accepted1, setAccepted1] = useState(false);
  const [accepted2, setAccepted2] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = accepted1 && accepted2;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestTournamentRegistration();
      if (!res.success) {
        setError(res.error ?? 'No pudimos enviar tu solicitud.');
        return;
      }
      // El Server Component padre va a re-leer el estado y mostrar PendingState
      // gracias al revalidatePath de la action.
    });
  };

  return (
    <>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-orange-600 tracking-widest font-semibold mb-2">
          PASO 4 DE 4
        </div>
        <h2 className="font-serif text-2xl font-bold mb-1">Inscripción al torneo</h2>
        <p className="text-sm text-slate-500">
          Confirmá tu disponibilidad para sumarte al torneo.
        </p>
      </div>

      {/* Mensaje si fue rechazado antes */}
      {wasRejected && (
        <div className="bg-amber-50 border border-amber-200 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <div className="font-semibold mb-1">
              Tu solicitud anterior fue rechazada.
            </div>
            {rejectionReason && (
              <div className="mb-1">
                Motivo: <em>«{rejectionReason}»</em>
              </div>
            )}
            <div>Podés volver a intentarlo ahora.</div>
          </div>
        </div>
      )}

      {/* Card del torneo */}
      <div className="border border-slate-200 mb-6 overflow-hidden">
        <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-orange-500/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] text-orange-400 tracking-widest font-semibold mb-1">
                TORNEO ACTIVO
              </div>
              <div className="font-serif text-2xl font-bold">{tournament.name}</div>
              <div className="text-blue-200 text-xs mt-1">
                Fútbol 9 · 24 equipos · 12 fechas
              </div>
            </div>
            <Trophy className="w-14 h-14 text-orange-400/40" />
          </div>
        </div>
      </div>

      {/* Aviso médico informativo */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 mb-6 flex items-start gap-3">
        <Heart className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900">
          <div className="font-semibold mb-1">Asistencia médica durante los partidos</div>
          <div>
            Durante los 3 horarios de juego contamos con{' '}
            <strong>ambulancia contratada</strong> y <strong>desfibrilador</strong> en la sede.
            Jugás tranquilo.
          </div>
        </div>
      </div>

      {/* Confirmaciones */}
      <div className="bg-white border border-slate-200 p-5 mb-5">
        <h3 className="font-serif font-bold text-sm tracking-wide mb-4">Confirmaciones</h3>
        <div className="space-y-3">
          <Checkbox
            checked={accepted1}
            onChange={setAccepted1}
            label="Confirmo mi disponibilidad los sábados de 10:00 a 14:00"
            hint="Los partidos se juegan en 3 horarios: 10:00, 11:30 y 13:00."
          />
          <Checkbox
            checked={accepted2}
            onChange={setAccepted2}
            label="Acepto el reglamento del torneo y el código de conducta"
            hint={
              <>
                <Link href="/regulation" className="text-blue-700 hover:underline">
                  Leer reglamento completo
                </Link>
                {' '}· incluye tarjetas, suspensiones, fair play.
              </>
            }
          />
        </div>
      </div>

      {/* Aprobación info */}
      <div className="bg-amber-50 border border-amber-200 p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <div className="font-semibold mb-1">
            Tu inscripción requiere aprobación del administrador.
          </div>
          <div>
            Una vez enviada, el admin revisará tu perfil y te avisará por email cuando quedes
            inscripto. Este proceso puede tardar hasta 48hs.
          </div>
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
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
            canSubmit && !isPending
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isPending ? 'Enviando...' : 'Solicitar inscripción'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        className={`w-5 h-5 border flex items-center justify-center flex-shrink-0 mt-0.5 ${
          checked
            ? 'bg-orange-500 border-orange-500'
            : 'bg-white border-slate-300 group-hover:border-slate-500'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado "pendiente de aprobación"
// ─────────────────────────────────────────────────────────────────────────────

function PendingState({ tournamentName }: { tournamentName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelTournamentRegistration();
      if (!res.success) {
        setError(res.error ?? 'No pudimos cancelar.');
        setConfirming(false);
      }
    });
  };

  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-amber-50 border-2 border-amber-300 rounded-full mx-auto mb-6 flex items-center justify-center">
        <Clock className="w-9 h-9 text-amber-600" strokeWidth={1.5} />
      </div>
      <div className="font-mono text-[10px] text-amber-700 tracking-widest font-semibold mb-2">
        INSCRIPCIÓN ENVIADA
      </div>
      <h2 className="font-serif text-3xl font-bold mb-3">
        Solicitud pendiente de aprobación
      </h2>
      <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto">
        Recibimos tu solicitud para <strong>{tournamentName}</strong>. El admin la
        revisará y te avisaremos por email cuando quedes inscripto.
      </p>

      {/* Timeline */}
      <div className="text-left max-w-md mx-auto bg-slate-50 border border-slate-200 p-5 mb-6">
        <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-4">
          Estado de tu inscripción
        </div>
        <div className="space-y-4">
          <TimelineStep done label="Perfil completado" sub="Datos personales y posición" />
          <TimelineStep done label="Inscripción enviada" sub="En las últimas horas" />
          <TimelineStep current label="Aprobación del admin" sub="Pendiente · hasta 48hs" />
          <TimelineStep label="Asignación a equipo" sub="Después del sorteo" />
          <TimelineStep label="¡A jugar!" sub="Cuando arranque el torneo" isLast />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 mb-4 flex items-start gap-2 max-w-md mx-auto">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {!confirming ? (
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="bg-blue-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-800"
          >
            Ir al dashboard
          </Link>
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-slate-500 hover:text-red-600"
          >
            Cancelar solicitud
          </button>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 p-4 max-w-md mx-auto">
          <div className="text-sm font-semibold text-red-900 mb-2">
            ¿Estás seguro que querés cancelar?
          </div>
          <div className="text-xs text-red-700 mb-3">
            Vas a perder tu solicitud y tendrás que volver a enviarla.
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              No, mantener
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="bg-red-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              {isPending ? 'Cancelando...' : 'Sí, cancelar'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-500">
        Mientras esperás, podés{' '}
        <Link href="/profile" className="text-blue-700 hover:underline font-medium">
          revisar tu perfil
        </Link>
        {' '}o{' '}
        <Link href="/" className="text-blue-700 hover:underline font-medium">
          ver el fixture público
        </Link>
        .
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado "lista de espera"
// ─────────────────────────────────────────────────────────────────────────────

function WaitlistState({ tournamentName }: { tournamentName: string }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-slate-100 border-2 border-slate-300 rounded-full mx-auto mb-6 flex items-center justify-center">
        <CircleDashed className="w-9 h-9 text-slate-500" strokeWidth={1.5} />
      </div>
      <div className="font-mono text-[10px] text-slate-600 tracking-widest font-semibold mb-2">
        LISTA DE ESPERA
      </div>
      <h2 className="font-serif text-3xl font-bold mb-3">Estás en lista de espera</h2>
      <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto">
        El admin te puso en lista de espera para <strong>{tournamentName}</strong>.
        Si se libera un lugar vas a recibir aviso por email.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-blue-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-800"
      >
        Ir al dashboard
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sin torneo activo
// ─────────────────────────────────────────────────────────────────────────────

function NoActiveTournament() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-slate-100 border-2 border-slate-300 rounded-full mx-auto mb-6 flex items-center justify-center">
        <Trophy className="w-9 h-9 text-slate-400" strokeWidth={1.5} />
      </div>
      <div className="font-mono text-[10px] text-slate-600 tracking-widest font-semibold mb-2">
        NO HAY TORNEO ACTIVO
      </div>
      <h2 className="font-serif text-3xl font-bold mb-3">Por ahora no hay torneo abierto</h2>
      <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto">
        Cuando el admin active el próximo torneo vas a poder solicitar tu inscripción desde acá.
        Te avisaremos por email.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-blue-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-800"
      >
        Ir al dashboard
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline helpers
// ─────────────────────────────────────────────────────────────────────────────

function TimelineStep({
  done,
  current,
  label,
  sub,
  isLast,
}: {
  done?: boolean;
  current?: boolean;
  label: string;
  sub: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-6 h-6 flex items-center justify-center flex-shrink-0 ${
            done ? 'bg-emerald-600' : current ? 'bg-amber-500' : 'bg-slate-200'
          }`}
        >
          {done ? (
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          ) : current ? (
            <Clock className="w-3 h-3 text-white" />
          ) : (
            <CircleDashed className="w-3 h-3 text-slate-400" />
          )}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 mt-1 ${done ? 'bg-emerald-600' : 'bg-slate-200'}`}
            style={{ minHeight: '24px' }}
          />
        )}
      </div>
      <div className="pb-3">
        <div
          className={`text-sm font-medium ${
            current ? 'text-amber-700' : done ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          {label}
        </div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
    </div>
  );
}
